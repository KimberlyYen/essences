import type { ExtractEvent, ExtractParams } from '../types'
import { parseSseBlock } from './sse'

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
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() ?? ''
    for (const chunk of chunks) {
      const event = parseSseBlock(chunk)
      if (event) onEvent(event)
    }
  }

  if (buffer.trim()) {
    const event = parseSseBlock(buffer)
    if (event) onEvent(event)
  }
}
