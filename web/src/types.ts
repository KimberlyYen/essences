/**
 * 前後端共用的資料形狀。
 * API 回什麼、畫面上多存什麼，都先寫在這裡，改欄位時才不會各檔各寫一份。
 */

/** 題目規定的四個群組。後端回傳順序會交錯，前端要用這個順序重排。 */
export const GROUPS = ['基本資料', '營養標示', '檢驗結果', '廠商資訊'] as const
export type Group = (typeof GROUPS)[number]

/**
 * pending  = 需要人看一眼（低把握、缺漏、多候選）
 * accepted = 高把握預設通過，或使用者按了確認
 * edited   = 使用者改過值
 */
export type FieldStatus = 'pending' | 'accepted' | 'edited'

/** 後端 SSE `field` 事件的原始欄位。confidence 為 null 代表文件裡沒抽到。 */
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

/** 畫面上用的欄位：多記系統抽出的原值，才能「還原」；多記確認狀態。 */
export type ReviewField = ApiField & {
  originalValue: string
  status: FieldStatus
}

/** 解析階段推進，例如「辨識版面」。progress 是 0–100。 */
export type StageEvent = {
  type: 'stage'
  stage: string
  progress: number
  total?: number
}

/** 抽出一筆欄位。一次只來一筆，所以畫面可以邊抽邊顯示。 */
export type FieldEvent = {
  type: 'field'
  field: ApiField
}

/** 解析中途掛掉。已抽出的欄位要留下來。 */
export type ErrorEvent = {
  type: 'error'
  message: string
  code: string
}

/** 全部抽完。這時才允許送出，避免必填欄位還沒到就送走。 */
export type DoneEvent = {
  type: 'done'
  stage: string
  progress: number
  field_count: number
}

export type ExtractEvent = StageEvent | FieldEvent | ErrorEvent | DoneEvent

/** 整次解析的累積狀態。reducer 只改這裡，方便測試。 */
export type ExtractState = {
  stage: string
  progress: number
  total: number | null
  fields: ReviewField[]
  error: { message: string; code: string } | null
  done: boolean
  cancelled: boolean
}

/**
 * 打給 mock 後端的 query。
 * fail_at >= 0 會在第 N 筆觸發 error，用來測中途失敗。
 */
export type ExtractParams = {
  field_count: number
  speed: number
  fail_at: number
}

/** 左側篩選：全部 / 需檢查 / 必填 */
export type FilterId = 'all' | 'review' | 'required'
