/**
 * 單筆已儲存紀錄的詳細欄位。可編輯後寫回 Supabase。
 */
import { useEffect, useState } from 'react'
import { GROUPS, type ReviewField } from '../types'
import {
  fromDateInputValue,
  groupFields,
  isDateFieldLabel,
  toDateInputValue,
  type FieldSnapshot,
} from '../lib/fields'
import {
  canSaveSnapshots,
  detailFieldsFromSaved,
  setSnapshotValue,
  snapshotsHaveChanges,
  updateSavedReview,
  type SavedReview,
} from '../lib/reviews'

type Props = {
  row: SavedReview
  onBack: () => void
  onSaved: (row: SavedReview) => void
}

function formatSavedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-TW', { hour12: false })
}

function statusLabel(status: FieldSnapshot['status']): string {
  if (status === 'edited') return '已修改'
  if (status === 'pending') return '未確認'
  return '已接受'
}

/** 快照沒有 originalValue / confidence，補上才能重用 groupFields。 */
function asReviewFields(snapshots: FieldSnapshot[]): ReviewField[] {
  return snapshots.map((item) => ({
    id: item.id,
    label: item.label,
    group: item.group,
    value: item.value,
    confidence: null,
    required: item.required,
    page: item.page,
    originalValue: item.value,
    status: item.status,
  }))
}

export function RecordDetail({ row, onBack, onSaved }: Props) {
  const original = detailFieldsFromSaved(row)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(original)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(detailFieldsFromSaved(row))
    setEditing(false)
    setError(null)
  }, [row])

  const snapshots = editing ? draft : original
  const grouped = groupFields(asReviewFields(snapshots))
  const fromSnapshot = row.fields.length > 0
  const dirty = snapshotsHaveChanges(original, draft)
  const ready = canSaveSnapshots(draft)
  const title = (editing ? draft : original).find((field) => field.label === '品名')?.value || row.product_name

  function startEdit() {
    setDraft(detailFieldsFromSaved(row))
    setError(null)
    setEditing(true)
  }

  function cancelEdit() {
    setDraft(detailFieldsFromSaved(row))
    setError(null)
    setEditing(false)
  }

  async function save() {
    if (!ready || !dirty || saving) return
    setSaving(true)
    setError(null)
    try {
      onSaved(await updateSavedReview(row.id, original, draft))
      setEditing(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-dvh pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-line px-3 py-2 text-sm text-ink hover:bg-paper-2"
          >
            <span aria-hidden="true">←</span>
            上一頁
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-lg text-ink">{title}</p>
            <p className="truncate text-xs text-muted">
              {formatSavedAt(row.created_at)} · {row.filename}
            </p>
          </div>
          {editing ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="min-h-11 rounded-sm border border-line px-3 py-2 text-sm text-ink hover:bg-paper-2 disabled:opacity-40"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={!dirty || !ready || saving}
                title={!ready ? '法規必填欄位未填寫完整' : !dirty ? '沒有修改' : undefined}
                className="min-h-11 rounded-sm bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? '儲存中…' : '儲存'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              className="min-h-11 rounded-sm bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              編輯
            </button>
          )}
        </div>
        {error ? (
          <div className="border-t border-danger/20 bg-danger-bg" role="alert">
            <p className="mx-auto max-w-5xl px-4 py-2 text-sm text-danger">{error}</p>
          </div>
        ) : null}
        {editing && !ready ? (
          <div className="border-t border-danger/20 bg-danger-bg" role="alert">
            <p className="mx-auto max-w-5xl px-4 py-2 text-sm text-danger">
              法規必填欄位不能空白。填上品名、有效日期、廠商名稱後才能儲存。
            </p>
          </div>
        ) : null}
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 py-8">
        {!fromSnapshot ? (
          <p className="mb-8 text-sm text-muted">
            這筆只存了法規必填。儲存後會留下完整欄位快照。
          </p>
        ) : null}

        {GROUPS.map((group) => {
          const fields = grouped.get(group) ?? []
          if (fields.length === 0) return null
          return (
            <section key={group} className="mb-10">
              <h2 className="mb-2 font-serif text-xl text-ink">
                {group}
                <span className="ml-2 font-sans text-sm text-muted">{fields.length}</span>
              </h2>
              {editing ? (
                <div className="divide-y divide-line border-t border-line">
                  {fields.map((field) => (
                    <EditField
                      key={field.id}
                      field={{
                        id: field.id,
                        label: field.label,
                        group: field.group,
                        value: field.value,
                        required: field.required,
                        status: field.status,
                        page: field.page,
                      }}
                      onChange={(id, value) => setDraft((current) => setSnapshotValue(current, id, value))}
                    />
                  ))}
                </div>
              ) : (
                <dl className="divide-y divide-line border-t border-line">
                  {fields.map((field) => (
                    <div key={field.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                      <dt className="text-sm font-medium text-ink">
                        {field.label}
                        {field.required ? (
                          <span className="ml-1 text-danger" aria-hidden="true">
                            *
                          </span>
                        ) : null}
                      </dt>
                      <dd className="max-w-full text-right text-sm text-ink-soft">
                        <span className="text-ink">{field.value.trim() === '' ? '—' : field.value}</span>
                        {fromSnapshot ? (
                          <span className="ml-2 text-xs text-muted">{statusLabel(field.status)}</span>
                        ) : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          )
        })}
      </main>
    </div>
  )
}

function EditField({
  field,
  onChange,
}: {
  field: FieldSnapshot
  onChange: (id: string, value: string) => void
}) {
  const missing = field.required && field.value.trim() === ''
  const inputId = `saved-field-${field.id}`
  const dateField = isDateFieldLabel(field.label)

  return (
    <div className="py-3">
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {field.label}
        {field.required ? (
          <>
            <span className="ml-1 text-danger" aria-hidden="true">
              *
            </span>
            <span className="sr-only">（必填）</span>
          </>
        ) : null}
      </label>
      {dateField ? (
        <input
          id={inputId}
          type="date"
          value={toDateInputValue(field.value)}
          onChange={(event) => onChange(field.id, fromDateInputValue(event.target.value))}
          aria-required={field.required}
          aria-invalid={missing}
          className="mt-1.5 w-full min-h-11 rounded-sm border border-line bg-card px-3 py-2 text-sm text-ink"
        />
      ) : (
        <input
          id={inputId}
          value={field.value}
          onChange={(event) => onChange(field.id, event.target.value)}
          aria-required={field.required}
          aria-invalid={missing}
          className="mt-1.5 w-full min-h-11 rounded-sm border border-line bg-card px-3 py-2 text-sm text-ink"
        />
      )}
    </div>
  )
}
