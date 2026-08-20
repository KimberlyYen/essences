/**
 * 欄位規則集中在這裡，不放進 React。
 * 送出能不能按、要不要標「需檢查」、怎麼分組，面試被問「拿掉會怎樣」就是這檔。
 */
import { GROUPS, type ApiField, type FieldStatus, type Group, type ReviewField } from '../types'

/**
 * 後端低把握大約 0.31–0.68，高把握大約 0.82–0.99。
 * 0.75 切在兩群中間。這是前端自己定的門檻，不是 API 契約。
 */
export const LOW_CONFIDENCE_THRESHOLD = 0.75

/** 題目點名的三個法規必填。沒抽到也必須讓使用者補，不能空著送出。 */
export const REQUIRED_LABELS = ['品名', '有效日期', '廠商名稱'] as const

export function isGroup(value: string): value is Group {
  // 後端 group 若出乎預期，groupFields 會退回「基本資料」
  return (GROUPS as readonly string[]).includes(value)
}

/**
 * 剛抽出來時，要不要進「待確認」。
 * 缺漏、多候選、沒把握 → pending；高把握且只有一個值 → 直接 accepted。
 * 上百欄不能每列都逼人按確認，所以高把握預設通過。
 */
export function shouldStartPending(field: ApiField): boolean {
  if (field.required && field.value.trim() === '') return true
  if (field.candidates && field.candidates.length > 0) return true
  if (field.confidence === null) return true
  return field.confidence < LOW_CONFIDENCE_THRESHOLD
}

/** 把 API 欄位加上 originalValue / status，之後才能還原、判斷有沒有改過。 */
export function toReviewField(field: ApiField): ReviewField {
  return {
    ...field,
    originalValue: field.value,
    status: shouldStartPending(field) ? 'pending' : 'accepted',
  }
}

export function isMissingRequired(field: Pick<ReviewField, 'required' | 'value'>): boolean {
  return field.required && field.value.trim() === ''
}

/** 「需檢查」= 必填還空，或狀態仍是 pending。 */
export function needsReview(field: ReviewField): boolean {
  return isMissingRequired(field) || field.status === 'pending'
}

/** 三個必填標籤還沒出現在結果裡（解析中途取消時常發生）。 */
export function absentRequiredLabels(fields: ReviewField[]): string[] {
  const labels = new Set(fields.map((field) => field.label))
  return REQUIRED_LABELS.filter((label) => !labels.has(label))
}

/**
 * 送出的硬條件：三個法規必填都在、而且都有值。
 * 低把握、多候選不擋送出——否則上百欄會變成處罰。
 */
export function canSubmit(fields: ReviewField[]): boolean {
  if (fields.length === 0) return false
  if (absentRequiredLabels(fields).length > 0) return false
  return !fields.some(isMissingRequired)
}

/** 畫面上紅條要點名哪些必填：空的 + 根本還沒抽出來的。 */
export function missingRequiredLabels(fields: ReviewField[]): string[] {
  const empty = fields.filter(isMissingRequired).map((field) => field.label)
  const absent = absentRequiredLabels(fields)
  return [...new Set([...empty, ...absent])]
}

/**
 * 後端照文件順序回，同組不保證相鄰。
 * 這裡重排成四個群組，組內維持到達順序。
 */
export function groupFields(fields: ReviewField[]): Map<Group, ReviewField[]> {
  const grouped = new Map<Group, ReviewField[]>()
  for (const group of GROUPS) grouped.set(group, [])
  for (const field of fields) {
    const group: Group = isGroup(field.group) ? field.group : '基本資料'
    grouped.get(group)!.push(field)
  }
  return grouped
}

/** 打字修改。必填被清成空白要回到 pending，不能假裝已確認。 */
export function updateFieldValue(
  fields: ReviewField[],
  id: string,
  value: string,
): ReviewField[] {
  return fields.map((field) => {
    if (field.id !== id) return field
    const trimmedEmpty = value.trim() === ''
    if (field.required && trimmedEmpty) {
      return { ...field, value, status: 'pending' }
    }
    return {
      ...field,
      value,
      status: value === field.originalValue ? 'accepted' : 'edited',
    }
  })
}

/** 「確認」：空的必填不能確認。未改動的欄位會維持同一個物件，FieldRow 的 memo 才有用。 */
export function acceptField(fields: ReviewField[], id: string): ReviewField[] {
  return fields.map((field) => {
    if (field.id !== id) return field
    if (isMissingRequired(field)) return field
    return { ...field, status: 'accepted' }
  })
}

/** 點候選值。選回系統首選算 accepted，選別的算 edited。 */
export function pickCandidate(
  fields: ReviewField[],
  id: string,
  value: string,
): ReviewField[] {
  return fields.map((field) => {
    if (field.id !== id) return field
    return {
      ...field,
      value,
      status: value === field.originalValue ? 'accepted' : 'edited',
    }
  })
}

/** 還原成系統抽出的值，並重新計算要不要 pending。 */
export function resetField(fields: ReviewField[], id: string): ReviewField[] {
  return fields.map((field) => {
    if (field.id !== id) return field
    return toReviewField({
      id: field.id,
      label: field.label,
      group: field.group,
      value: field.originalValue,
      confidence: field.confidence,
      required: field.required,
      page: field.page,
      candidates: field.candidates,
    })
  })
}

/** 送出當下的完整欄位快照，寫進 reviews.fields，點進去才能看詳細。 */
export type FieldSnapshot = {
  id: string
  label: string
  group: string
  value: string
  required: boolean
  status: FieldStatus
  page: number
}

export function payloadForSubmit(fields: ReviewField[]): FieldSnapshot[] {
  return fields.map((field) => ({
    id: field.id,
    label: field.label,
    group: field.group,
    value: field.value,
    required: field.required,
    status: field.status,
    page: field.page,
  }))
}

/** 真正寫進 Supabase 的列：只留三個法規必填。 */
export type RequiredReviewRow = {
  filename: string
  document_id: string | null
  product_name: string
  expiry_date: string
  vendor_name: string
}

export function requiredReviewRow(
  filename: string,
  documentId: string | null,
  fields: ReviewField[],
): RequiredReviewRow {
  const valueOf = (label: (typeof REQUIRED_LABELS)[number]) =>
    fields.find((field) => field.label === label)?.value.trim() ?? ''

  return {
    filename,
    document_id: documentId,
    product_name: valueOf('品名'),
    expiry_date: valueOf('有效日期'),
    vendor_name: valueOf('廠商名稱'),
  }
}

/** 標籤含「日期」才用日期選單，例如有效日期、製造日期。保存期限不含「日期」。 */
export function isDateFieldLabel(label: string): boolean {
  return label.includes('日期')
}

/** 畫面存 2027/01/08；native date input 要 2027-01-08。 */
export function toDateInputValue(value: string): string {
  const match = value.trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (!match) return ''
  const [, year, month, day] = match
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

/** date input 清空時回空字串，讓必填缺漏規則繼續擋送出。 */
export function fromDateInputValue(iso: string): string {
  const match = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ''
  return `${match[1]}/${match[2]}/${match[3]}`
}
