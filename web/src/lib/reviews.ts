/**
 * 審核結果寫入 / 讀出 / 更新 Supabase 的 reviews 表。
 * 三個法規必填各一欄，全部欄位放 fields jsonb。表要先跑 supabase/reviews.sql。
 */
import {
  canSubmit,
  payloadForSubmit,
  REQUIRED_LABELS,
  requiredReviewRow,
  type FieldSnapshot,
  type RequiredReviewRow,
} from './fields'
import { createClient } from './supabase/client'
import type { FieldStatus, ReviewField } from '../types'

export type SavedReview = RequiredReviewRow & {
  id: string
  created_at: string
  fields: FieldSnapshot[]
}

function saveErrorMessage(message: string): string {
  if (message.includes('Could not find the table') || message.includes('schema cache')) {
    return '資料表 reviews 尚未建立，或還沒有 fields 欄位。請到 Supabase SQL Editor 再執行一次 supabase/reviews.sql。'
  }
  if (message.toLowerCase().includes('row-level security') || message.includes('RLS')) {
    return '存取被拒絕。請到 Supabase SQL Editor 再執行一次 supabase/reviews.sql，確認已開放 anon 的 insert / select / update。'
  }
  return `無法連線 Supabase：${message}`
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

const STATUSES: FieldStatus[] = ['pending', 'accepted', 'edited']

function asStatus(value: unknown): FieldStatus {
  return STATUSES.includes(value as FieldStatus) ? (value as FieldStatus) : 'accepted'
}

/** jsonb / 舊資料都收成快照；壞掉的列直接跳過。 */
export function parseFieldSnapshots(value: unknown): FieldSnapshot[] {
  if (!Array.isArray(value)) return []
  const snapshots: FieldSnapshot[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    snapshots.push({
      id: asString(row.id),
      label: asString(row.label),
      group: asString(row.group, '基本資料'),
      value: asString(row.value),
      required: Boolean(row.required),
      status: asStatus(row.status),
      page: typeof row.page === 'number' ? row.page : 1,
    })
  }
  return snapshots
}

/**
 * 點進去要看的欄位。
 * 新紀錄用 fields jsonb；舊紀錄沒快照時，至少把三個必填攤出來，不要空白頁。
 */
export function detailFieldsFromSaved(row: SavedReview): FieldSnapshot[] {
  if (row.fields.length > 0) return row.fields
  return [
    {
      id: 'product_name',
      label: '品名',
      group: '基本資料',
      value: row.product_name,
      required: true,
      status: 'accepted',
      page: 1,
    },
    {
      id: 'expiry_date',
      label: '有效日期',
      group: '基本資料',
      value: row.expiry_date,
      required: true,
      status: 'accepted',
      page: 1,
    },
    {
      id: 'vendor_name',
      label: '廠商名稱',
      group: '廠商資訊',
      value: row.vendor_name,
      required: true,
      status: 'accepted',
      page: 1,
    },
  ]
}

export function setSnapshotValue(fields: FieldSnapshot[], id: string, value: string): FieldSnapshot[] {
  return fields.map((field) => (field.id === id ? { ...field, value } : field))
}

/** 有改過的列標成 edited；三個法規必填同步回獨立欄位。 */
export function payloadForUpdate(original: FieldSnapshot[], draft: FieldSnapshot[]) {
  const fields = draft.map((field) => {
    const before = original.find((item) => item.id === field.id)
    if (before && before.value !== field.value) {
      return { ...field, status: 'edited' as const }
    }
    return field
  })
  const valueOf = (label: (typeof REQUIRED_LABELS)[number]) =>
    fields.find((field) => field.label === label)?.value.trim() ?? ''

  return {
    product_name: valueOf('品名'),
    expiry_date: valueOf('有效日期'),
    vendor_name: valueOf('廠商名稱'),
    fields,
  }
}

export function canSaveSnapshots(fields: FieldSnapshot[]): boolean {
  return REQUIRED_LABELS.every((label) => {
    const field = fields.find((item) => item.label === label)
    return Boolean(field && field.value.trim() !== '')
  })
}

export function snapshotsHaveChanges(original: FieldSnapshot[], draft: FieldSnapshot[]): boolean {
  if (original.length !== draft.length) return true
  return draft.some((field) => original.find((item) => item.id === field.id)?.value !== field.value)
}

function mapSavedReview(row: Record<string, unknown>): SavedReview {
  return {
    id: asString(row.id),
    filename: asString(row.filename),
    document_id: typeof row.document_id === 'string' ? row.document_id : null,
    product_name: asString(row.product_name),
    expiry_date: asString(row.expiry_date),
    vendor_name: asString(row.vendor_name),
    created_at: asString(row.created_at),
    fields: parseFieldSnapshots(row.fields),
  }
}

const SAVED_REVIEW_COLUMNS =
  'id, filename, document_id, product_name, expiry_date, vendor_name, fields, created_at'

export async function saveRequiredReview(
  filename: string,
  documentId: string | null,
  fields: ReviewField[],
): Promise<RequiredReviewRow> {
  if (!canSubmit(fields)) {
    throw new Error('法規必填欄位未填寫完整，無法儲存。')
  }

  const row = requiredReviewRow(filename, documentId, fields)
  const supabase = createClient()
  const { error } = await supabase.from('reviews').insert({
    ...row,
    fields: payloadForSubmit(fields),
  })

  if (error) {
    throw new Error(saveErrorMessage(error.message))
  }

  return row
}

export async function updateSavedReview(id: string, original: FieldSnapshot[], draft: FieldSnapshot[]): Promise<SavedReview> {
  if (!canSaveSnapshots(draft)) {
    throw new Error('法規必填欄位未填寫完整，無法儲存。')
  }

  const payload = payloadForUpdate(original, draft)
  const supabase = createClient()
  const { data, error } = await supabase
    .from('reviews')
    .update(payload)
    .eq('id', id)
    .select(SAVED_REVIEW_COLUMNS)
    .single()

  if (error) {
    throw new Error(saveErrorMessage(error.message))
  }

  return mapSavedReview((data ?? {}) as Record<string, unknown>)
}

export async function listRequiredReviews(): Promise<SavedReview[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select(SAVED_REVIEW_COLUMNS)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(saveErrorMessage(error.message))
  }

  return (data ?? []).map((row) => mapSavedReview(row as Record<string, unknown>))
}
