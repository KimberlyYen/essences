import { GROUPS, type ApiField, type Group, type ReviewField } from '../types'

/** 後端把低把握落在 0.31–0.68、高把握落在 0.82–0.99，中間這條線分開兩群。 */
export const LOW_CONFIDENCE_THRESHOLD = 0.75

export const REQUIRED_LABELS = ['品名', '有效日期', '廠商名稱'] as const

export function isGroup(value: string): value is Group {
  return (GROUPS as readonly string[]).includes(value)
}

export function shouldStartPending(field: ApiField): boolean {
  if (field.required && field.value.trim() === '') return true
  if (field.candidates && field.candidates.length > 0) return true
  if (field.confidence === null) return true
  return field.confidence < LOW_CONFIDENCE_THRESHOLD
}

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

export function needsReview(field: ReviewField): boolean {
  return isMissingRequired(field) || field.status === 'pending'
}

export function absentRequiredLabels(fields: ReviewField[]): string[] {
  const labels = new Set(fields.map((field) => field.label))
  return REQUIRED_LABELS.filter((label) => !labels.has(label))
}

/**
 * 送出的硬條件：三個法規必填都在、而且都有值。
 * 低把握、多候選不擋送出——上百欄時把每筆都變成硬門檻，使用者會放棄。
 */
export function canSubmit(fields: ReviewField[]): boolean {
  if (fields.length === 0) return false
  if (absentRequiredLabels(fields).length > 0) return false
  return !fields.some(isMissingRequired)
}

export function missingRequiredLabels(fields: ReviewField[]): string[] {
  const empty = fields.filter(isMissingRequired).map((field) => field.label)
  const absent = absentRequiredLabels(fields)
  return [...new Set([...empty, ...absent])]
}

export function groupFields(fields: ReviewField[]): Map<Group, ReviewField[]> {
  const grouped = new Map<Group, ReviewField[]>()
  for (const group of GROUPS) grouped.set(group, [])
  for (const field of fields) {
    const group: Group = isGroup(field.group) ? field.group : '基本資料'
    grouped.get(group)!.push(field)
  }
  return grouped
}

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

export function acceptField(fields: ReviewField[], id: string): ReviewField[] {
  return fields.map((field) => {
    if (field.id !== id) return field
    if (isMissingRequired(field)) return field
    return { ...field, status: 'accepted' }
  })
}

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

export function payloadForSubmit(fields: ReviewField[]) {
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
