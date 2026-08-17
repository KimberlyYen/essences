export const GROUPS = ['基本資料', '營養標示', '檢驗結果', '廠商資訊'] as const
export type Group = (typeof GROUPS)[number]

export type FieldStatus = 'pending' | 'accepted' | 'edited'

export type ApiField = {
  id: string
  label: string
  group: string
  value: string
  confidence: number | null
  required: boolean
  page: number
  candidates?: string[]
}

export type ReviewField = ApiField & {
  originalValue: string
  status: FieldStatus
}

export type StageEvent = {
  type: 'stage'
  stage: string
  progress: number
  total?: number
}

export type FieldEvent = {
  type: 'field'
  field: ApiField
}

export type ErrorEvent = {
  type: 'error'
  message: string
  code: string
}

export type DoneEvent = {
  type: 'done'
  stage: string
  progress: number
  field_count: number
}

export type ExtractEvent = StageEvent | FieldEvent | ErrorEvent | DoneEvent

export type ExtractState = {
  stage: string
  progress: number
  total: number | null
  fields: ReviewField[]
  error: { message: string; code: string } | null
  done: boolean
  cancelled: boolean
}

export type ExtractParams = {
  field_count: number
  speed: number
  fail_at: number
}

export type FilterId = 'all' | 'review' | 'required'
