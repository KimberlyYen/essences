/**
 * 單筆已儲存紀錄的詳細欄位。可編輯後寫回 Supabase。
 */
import { useEffect, useState } from 'react'
import { GROUPS, type FilterId, type Group, type ReviewField } from '../types'
import { groupFields, needsReview, shouldCollapseGroups, type FieldSnapshot } from '../lib/fields'
import { candidatesForField } from '../lib/candidates'
import {
  canSaveSnapshots,
  detailFieldsFromSaved,
  setSnapshotValue,
  snapshotsHaveChanges,
  updateSavedReview,
  deleteSavedReview,
  type SavedReview,
} from '../lib/reviews'

type Props = {
  row: SavedReview
  onBack: () => void
  onSaved: (row: SavedReview) => void
  onDeleted: () => void
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
    candidates: item.candidates,
  }))
}

export function RecordDetail({ row, onBack, onSaved, onDeleted }: Props) {
  const original = detailFieldsFromSaved(row)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(original)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterId>('review')
  const [activeGroup, setActiveGroup] = useState<Group | 'all'>('all')
  const [openGroup, setOpenGroup] = useState<Group | null>(null)

  useEffect(() => {
    setDraft(detailFieldsFromSaved(row))
    setEditing(false)
    setError(null)
    setFilter('review')
    setActiveGroup('all')
    setOpenGroup(null)
  }, [row])

  const snapshots = editing ? draft : original
  const reviewFields = asReviewFields(snapshots)
  const reviewCount = reviewFields.filter(needsReview).length
  const requiredCount = reviewFields.filter((field) => field.required).length
  const grouped = groupFields(reviewFields)
  const visible = reviewFields.filter((field) => {
    if (filter === 'review' && !needsReview(field)) return false
    if (filter === 'required' && !field.required) return false
    if (activeGroup !== 'all' && field.group !== activeGroup) return false
    return true
  })
  const visibleGrouped = groupFields(visible)
  const accordion = shouldCollapseGroups(filter, activeGroup)
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

  async function remove() {
    if (deleting) return
    const label = title.trim() || row.filename
    if (!window.confirm(`確定刪除「${label}」這筆紀錄？`)) return
    setDeleting(true)
    setError(null)
    try {
      await deleteSavedReview(row.id)
      onDeleted()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '刪除失敗')
    } finally {
      setDeleting(false)
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void remove()}
                disabled={deleting}
                className="min-h-11 rounded-sm border border-danger/30 px-3 py-2 text-sm text-danger hover:bg-danger-bg disabled:opacity-40"
              >
                {deleting ? '刪除中…' : '刪除'}
              </button>
              <button
                type="button"
                onClick={startEdit}
                disabled={deleting}
                className="min-h-11 rounded-sm bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
              >
                編輯
              </button>
            </div>
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

      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-6 md:grid-cols-[13rem_1fr]">
        <aside className="md:sticky md:top-24 md:self-start">
          <nav aria-label="篩選" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-col md:gap-1 md:px-0">
            <FilterButton current={filter} id="all" onClick={setFilter} label={`全部 ${reviewFields.length}`} />
            <FilterButton current={filter} id="review" onClick={setFilter} label={`需檢查 ${reviewCount}`} />
            <FilterButton current={filter} id="required" onClick={setFilter} label={`必填 ${requiredCount}`} />
          </nav>
          <nav aria-label="欄位群組" className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-col md:gap-1 md:px-0">
            <button
              type="button"
              onClick={() => setActiveGroup('all')}
              aria-current={activeGroup === 'all' ? 'true' : undefined}
              className={navClass(activeGroup === 'all')}
            >
              所有群組
            </button>
            {GROUPS.map((group) => {
              const count = grouped.get(group)?.length ?? 0
              const reviewInGroup = grouped.get(group)?.filter(needsReview).length ?? 0
              if (count === 0) return null
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => setActiveGroup(group)}
                  aria-current={activeGroup === group ? 'true' : undefined}
                  className={navClass(activeGroup === group)}
                >
                  <span>{group}</span>
                  <span className="text-muted">
                    {count}
                    {reviewInGroup ? ` · ${reviewInGroup}` : ''}
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        <main id="main">
        {!fromSnapshot ? (
          <p className="mb-8 text-sm text-muted">
            這筆只存了法規必填。儲存後會留下完整欄位快照。
          </p>
        ) : (
          <p className="mb-8 text-sm text-ink-soft">
            橘色是需檢查。有其他可能值的欄位，選項會列在輸入框下面，可點選或自己填。
          </p>
        )}

        {accordion ? (
          <p className="mb-6 text-sm text-ink-soft">
            欄位數量隨文件變化，全部攤開會變成一條很長的捲軸。點群組標題展開該組，或改用左側「需檢查」。
          </p>
        ) : null}

        {GROUPS.map((group) => {
          const fields = visibleGrouped.get(group) ?? []
          if (fields.length === 0) return null
          const expanded = !accordion || openGroup === group
          return (
            <section key={group} className="mb-10">
              <h2 className="mb-2 bg-paper/95 px-1 py-2 font-serif text-xl text-ink md:sticky md:top-20 md:z-10 md:-mx-1 md:backdrop-blur">
                {accordion ? (
                  <button
                    type="button"
                    onClick={() => setOpenGroup(openGroup === group ? null : group)}
                    aria-expanded={expanded}
                    className="flex min-h-11 w-full items-center justify-between gap-3 text-left"
                  >
                    <span>
                      {group}
                      <span className="ml-2 font-sans text-sm text-muted">{fields.length}</span>
                    </span>
                    <span className="font-sans text-sm font-normal text-accent">{expanded ? '收合' : '展開'}</span>
                  </button>
                ) : (
                  <>
                    {group}
                    <span className="ml-2 font-sans text-sm text-muted">{fields.length}</span>
                  </>
                )}
              </h2>
              {expanded ? (
              <dl className="divide-y divide-line border-t border-line">
                {fields.map((field) => {
                  const missing = field.required && field.value.trim() === ''
                  const inputId = `saved-field-${field.id}`
                  const candidates = candidatesForField(field)
                  return (
                    <div
                      key={field.id}
                      className={`border-l-2 py-3 pl-3 ${
                        field.required && field.value.trim() === ''
                          ? 'border-danger bg-danger-bg/60'
                          : needsReview(field)
                            ? 'border-warn bg-warn-bg/50'
                            : 'border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-x-4">
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
                        <dd className="flex min-w-0 flex-1 items-center justify-end gap-2 text-sm text-ink-soft">
                          {editing ? (
                            <input
                              id={inputId}
                              value={field.value}
                              onChange={(event) =>
                                setDraft((current) => setSnapshotValue(current, field.id, event.target.value))
                              }
                              aria-required={field.required}
                              aria-invalid={missing}
                              className={`min-h-11 min-w-0 flex-1 rounded-sm border bg-card px-3 py-2 text-right text-sm text-ink ${
                                missing ? 'border-danger' : 'border-line'
                              }`}
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
                              {candidates.length > 0 ? ' · 多候選' : ''}
                            </span>
                          ) : null}
                        </dd>
                      </div>
                      {candidates.length > 0 ? (
                        <div id={`${inputId}-candidates`} className="mt-2 rounded-sm border border-line bg-card px-3 py-2">
                          <p className="text-xs text-muted">
                            {editing
                              ? '系統抽出多個候選，選一個或自己在上方填'
                              : '系統抽出多個候選'}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {candidates.map((candidate) => {
                              const selected = field.value === candidate
                              return (
                                <button
                                  key={candidate}
                                  type="button"
                                  onClick={() => {
                                    if (!editing) {
                                      window.alert('請先點擊「編輯」')
                                      return
                                    }
                                    setDraft((current) => setSnapshotValue(current, field.id, candidate))
                                  }}
                                  aria-pressed={selected}
                                  className={`min-h-11 rounded-sm border px-3 py-2 text-xs ${
                                    selected
                                      ? 'border-accent bg-paper-2 text-accent'
                                      : 'border-line bg-paper text-ink-soft hover:border-accent hover:text-ink'
                                  }`}
                                >
                                  {candidate}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </dl>
              ) : null}
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
      className={navClass(current === id)}
    >
      {label}
    </button>
  )
}

function navClass(active: boolean) {
  return `flex min-h-11 w-full shrink-0 items-center justify-between whitespace-nowrap rounded-sm px-3 py-2 text-left text-sm md:px-2 md:py-1.5 ${
    active ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-paper-2'
  }`
}
