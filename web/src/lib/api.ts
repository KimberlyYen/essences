/**
 * 跟 mock 後端講話的地方。
 * 開發時 Vite 把 /api 轉到 localhost:8000；Docker 則由 nginx 轉到 api 服務。
 */
import type { ExtractEvent, ExtractParams } from '../types'
import { flushSseBuffer, parseSseBlock } from './sse'

/** POST multipart，欄位名稱必須是 file，後端才收得到。 */
export async function uploadDocument(file: File): Promise<{
  document_id: string
  filename: string
}> {
  const body = new FormData()
  body.append('file', file)
  const response = await fetch('/api/documents', { method: 'POST', body })
  if (!response.ok) {
    throw new Error('上傳失敗，請確認服務已啟動後再試。')
  }
  return response.json() as Promise<{ document_id: string; filename: string }>
}

/**
 * GET SSE。不用 EventSource，是因為取消解析需要 AbortController；
 * 後端文件寫了：客戶端斷線就會停運算。
 *
 * 串流可能把一個事件切成兩塊，所以用 buffer 拼到看到 \n\n 再 parse。
 */
export async function streamExtract(
  documentId: string,
  params: ExtractParams,
  onEvent: (event: ExtractEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const query = new URLSearchParams({
    field_count: String(params.field_count),
    speed: String(params.speed),
  })
  if (params.fail_at >= 0) query.set('fail_at', String(params.fail_at))

  const response = await fetch(`/api/documents/${documentId}/extract?${query}`, {
    headers: { Accept: 'text/event-stream' },
    signal,
  })

  if (!response.ok) {
    throw new Error(response.status === 404 ? '找不到這份文件，請重新上傳' : '無法開始解析')
  }
  if (!response.body) {
    throw new Error('無法讀取解析資料流')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    // stream: true 保留不完整的 UTF-8 字，下一輪再拼
    buffer += decoder.decode(value, { stream: true })
    const flushed = flushSseBuffer(buffer)
    buffer = flushed.rest
    for (const event of flushed.events) onEvent(event)
  }

  if (buffer.trim()) {
    const event = parseSseBlock(buffer)
    if (event) onEvent(event)
  }
}
