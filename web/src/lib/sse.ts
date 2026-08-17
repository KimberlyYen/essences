import type { ExtractEvent, ExtractState } from '../types'
import { toReviewField } from './fields'

export const initialExtractState: ExtractState = {
  stage: '等待開始',
  progress: 0,
  total: null,
  fields: [],
  error: null,
  done: false,
  cancelled: false,
}

export function parseSseBlock(block: string): ExtractEvent | null {
  const trimmed = block.trim()
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

export function reduceExtract(state: ExtractState, event: ExtractEvent): ExtractState {
  switch (event.type) {
    case 'stage':
      return {
        ...state,
        stage: event.stage,
        progress: event.progress,
        total: event.total ?? state.total,
        cancelled: false,
      }
    case 'field':
      return {
        ...state,
        fields: [...state.fields, toReviewField(event.field)],
        cancelled: false,
      }
    case 'error':
      return {
        ...state,
        error: { message: event.message, code: event.code },
      }
    case 'done':
      return {
        ...state,
        stage: event.stage,
        progress: event.progress,
        done: true,
        cancelled: false,
      }
  }
}
