/**
 * SSE 兩件事：把文字塊解析成事件、把事件累加進 ExtractState。
 * 純函式，所以 sse.test.ts 不用開瀏覽器就能測。
 */
import type { ExtractEvent, ExtractState } from '../types'
import { ensureRequiredFields, toReviewField } from './fields'

export const initialExtractState: ExtractState = {
  stage: '等待開始',
  progress: 0,
  total: null,
  fields: [],
  error: null,
  done: false,
  cancelled: false,
}

/**
 * 後端一個事件長這樣：
 *   event: field
 *   data: {"id":"f1", ...}
 *
 * 以空行分隔。註解行（: keep-alive）跟壞 JSON 要丟掉，不能讓後面整串掛掉。
 */
export function parseSseBlock(block: string): ExtractEvent | null {
  const trimmed = block.trim()
  // SSE 註解行以冒號開頭，例如 keep-alive，不是資料
  if (!trimmed || trimmed.startsWith(':')) return null

  let eventName = 'message'
  const dataLines: string[] = []

  for (const rawLine of trimmed.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    if (!line || line.startsWith(':')) continue
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim()
      continue
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  if (dataLines.length === 0) return null

  let data: unknown
  try {
    data = JSON.parse(dataLines.join('\n'))
  } catch {
    return null
  }

  if (typeof data !== 'object' || data === null) return null
  const record = data as Record<string, unknown>

  // 依 event 名稱對成前端的 union type；名稱認錯後面畫面都會錯
  if (eventName === 'stage') {
    return {
      type: 'stage',
      stage: String(record.stage ?? ''),
      progress: Number(record.progress ?? 0),
      total: typeof record.total === 'number' ? record.total : undefined,
    }
  }

  if (eventName === 'field') {
    return {
      type: 'field',
      field: {
        id: String(record.id ?? ''),
        label: String(record.label ?? ''),
        group: String(record.group ?? ''),
        value: String(record.value ?? ''),
        confidence: typeof record.confidence === 'number' ? record.confidence : null,
        required: Boolean(record.required),
        page: Number(record.page ?? 1),
        candidates: Array.isArray(record.candidates)
          ? record.candidates.map((item) => String(item))
          : undefined,
      },
    }
  }

  if (eventName === 'error') {
    return {
      type: 'error',
      message: String(record.message ?? '解析失敗'),
      code: String(record.code ?? 'UNKNOWN'),
    }
  }

  if (eventName === 'done') {
    return {
      type: 'done',
      stage: String(record.stage ?? '完成'),
      progress: Number(record.progress ?? 100),
      field_count: Number(record.field_count ?? 0),
    }
  }

  return null
}

/**
 * fetch 串流可能把一個 SSE 事件切成兩塊。
 * 湊到 \n\n 才 parse；不完整的尾巴留給下一輪。
 * README 寫這段最沒把握，所以抽成純函式讓測試餵半截 chunk。
 */
export function flushSseBuffer(buffer: string): { events: ExtractEvent[]; rest: string } {
  const parts = buffer.split('\n\n')
  const rest = parts.pop() ?? ''
  const events: ExtractEvent[] = []
  for (const part of parts) {
    const event = parseSseBlock(part)
    if (event) events.push(event)
  }
  return { events, rest }
}

/**
 * 收到事件就累加，不覆蓋舊欄位。
 * error 只記錯誤，fields 留下——題目說解析中途會掛，已抽出的還能改。
 */
export function reduceExtract(state: ExtractState, event: ExtractEvent): ExtractState {
  switch (event.type) {
    case 'stage':
      // 只改進度文字，欄位清單不動
      return {
        ...state,
        stage: event.stage,
        progress: event.progress,
        total: event.total ?? state.total,
        cancelled: false,
      }
    case 'field':
      // 接到一筆就 append，不要用新陣列蓋掉舊的
      return {
        ...state,
        fields: [...state.fields, toReviewField(event.field)],
        cancelled: false,
      }
    case 'error':
      // 不把 fields 清掉；缺席的必填補空白列，才能讓人填完再送
      return {
        ...state,
        error: { message: event.message, code: event.code },
        fields: ensureRequiredFields(state.fields),
      }
    case 'done':
      // done=true 之後 hook 才允許送出
      return {
        ...state,
        stage: event.stage,
        progress: event.progress,
        done: true,
        cancelled: false,
        fields: ensureRequiredFields(state.fields),
      }
  }
}
