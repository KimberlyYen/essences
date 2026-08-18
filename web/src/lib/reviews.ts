import { canSubmit, requiredReviewRow, type RequiredReviewRow } from './fields'
import { createClient } from './supabase/client'
import type { ReviewField } from '../types'

export type SavedReview = RequiredReviewRow & {
  id: string
  created_at: string
}

function saveErrorMessage(message: string): string {
  if (message.includes('Could not find the table') || message.includes('schema cache')) {
    return '資料表 reviews 尚未建立。請到 Supabase SQL Editor 執行 supabase/reviews.sql。'
  }
  if (message.toLowerCase().includes('row-level security') || message.includes('RLS')) {
    return '存取被拒絕。請確認 reviews 資料表已開放 anon 的 insert / select 政策。'
  }
  return `無法連線 Supabase：${message}`
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

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
  const { error } = await supabase.from('reviews').insert(row)

  if (error) {
    throw new Error(saveErrorMessage(error.message))
  }

  return row
}

export async function listRequiredReviews(): Promise<SavedReview[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('id, filename, document_id, product_name, expiry_date, vendor_name, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(saveErrorMessage(error.message))
  }

  return (data ?? []).map((row) => ({
    id: asString(row.id),
    filename: asString(row.filename),
    document_id: typeof row.document_id === 'string' ? row.document_id : null,
    product_name: asString(row.product_name),
    expiry_date: asString(row.expiry_date),
    vendor_name: asString(row.vendor_name),
    created_at: asString(row.created_at),
  }))
}
