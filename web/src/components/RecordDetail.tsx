/**
 * 單筆已儲存紀錄的詳細欄位。可編輯後寫回 Supabase。
 */
import { useEffect, useState } from 'react'
import { GROUPS, type FilterId, type ReviewField } from '../types'
import { groupFields, needsReview, type FieldSnapshot } from '../lib/fields'
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
  const [filter, setFilter] = useState<FilterId>('all')

  useEffect(() => {
    setDraft(detailFieldsFromSaved(row))
    setEditing(false)
    setError(null)
    setFilter('all')
  }, [row])

  const snapshots = editing ? draft : original
  const reviewFields = asReviewFields(snapshots)
  const reviewCount = reviewFields.filter(needsReview).length
  const requiredCount = reviewFields.filter((field) => field.required).length
  const visible = reviewFields.filter((field) => {
    if (filter === 'review') return needsReview(field)
    if (filter === 'required') return field.required
    return true
  })
  const grouped = groupFields(visible)
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
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
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
        <nav aria-label="篩選" className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 pb-3">
          <FilterButton current={filter} id="all" onClick={setFilter} label={`全部 ${reviewFields.length}`} />
          <FilterButton current={filter} id="review" onClick={setFilter} label={`需檢查 ${reviewCount}`} />
          <FilterButton current={filter} id="required" onClick={setFilter} label={`必填 ${requiredCount}`} />
        </nav>
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
        ) : (
          <p className="mb-8 text-sm text-ink-soft">
            橘色是需檢查：送出時還沒確認的欄位。點上方「需檢查」只看這些。
          </p>
        )}

        {GROUPS.map((group) => {
          const fields = grouped.get(group) ?? []
          if (fields.length === 0) return null
          return (
            <section key={group} className="mb-10">
              <h2 className="mb-2 font-serif text-xl text-ink">
                {group}
                <span className="ml-2 font-sans text-sm text-muted">{fields.length}</span>
              </h2>
              <dl className="divide-y divide-line border-t border-line">
                {fields.map((field) => {
                  const missing = field.required && field.value.trim() === ''
                  const inputId = `saved-field-${field.id}`
                  return (
                    <div
                      key={field.id}
                      className={`flex items-baseline justify-between gap-x-4 border-l-2 py-3 pl-3 ${
                        field.required && field.value.trim() === ''
                          ? 'border-danger bg-danger-bg/60'
                          : needsReview(field)
                            ? 'border-warn bg-warn-bg/50'
                            : 'border-transparent'
                      }`}
                    >
                      <dt className="shrink-0 text-sm font-medium text-ink">
                        {editing ? (
                          <label htmlFor={inputId}>
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
                        ) : (
                          <>
                            {field.label}
                            {field.required ? (
                              <span className="ml-1 text-danger" aria-hidden="true">
                                *
                              </span>
                            ) : null}
                          </>
                        )}
                      </dt>
                      <dd className="flex min-w-0 flex-1 items-baseline justify-end gap-2 text-sm text-ink-soft">
                        {editing ? (
                          <input
                            id={inputId}
                            value={field.value}
                            onChange={(event) =>
                              setDraft((current) => setSnapshotValue(current, field.id, event.target.value))
                            }
                            aria-required={field.required}
                            aria-invalid={missing}
                            className="min-w-0 flex-1 bg-transparent p-0 text-right text-sm text-ink outline-none"
                          />
                        ) : (
                          <span className="text-ink">{field.value.trim() === '' ? '—' : field.value}</span>
                        )}
                        {fromSnapshot ? (
                          <span
                            className={`shrink-0 text-xs ${
                              missing ? 'text-danger' : field.status === 'pending' ? 'text-warn' : 'text-muted'
                            }`}
                          >
                            {missing ? '未填寫' : statusLabel(field.status)}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </section>
          )
        })}

        {visible.length === 0 ? (
          <p className="text-sm text-muted">
            {filter === 'review' ? '沒有需要特別檢查的欄位。' : '沒有符合條件的欄位。'}
          </p>
        ) : null}
      </main>
    </div>
  )
}

function FilterButton({
  current,
  id,
  label,
  onClick,
}: {
  current: FilterId
  id: FilterId
  label: string
  onClick: (id: FilterId) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      aria-pressed={current === id}
      className={`min-h-11 shrink-0 rounded-sm px-3 py-2 text-sm ${
        current === id ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-paper-2'
      }`}
    >
      {label}
    </button>
  )
}
