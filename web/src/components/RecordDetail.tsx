/**
 * 單筆已儲存紀錄的詳細欄位。只讀，依群組排，跟審核頁同一套分組。
 */
import { GROUPS } from '../types'
import { groupFields } from '../lib/fields'
import { detailFieldsFromSaved, type SavedReview } from '../lib/reviews'
import type { FieldSnapshot } from '../lib/fields'
import type { ReviewField } from '../types'

type Props = {
  row: SavedReview
  onBack: () => void
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

export function RecordDetail({ row, onBack }: Props) {
  const snapshots = detailFieldsFromSaved(row)
  const grouped = groupFields(asReviewFields(snapshots))
  const fromSnapshot = row.fields.length > 0

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
          <div className="min-w-0">
            <p className="truncate font-serif text-lg text-ink">{row.product_name}</p>
            <p className="truncate text-xs text-muted">
              {formatSavedAt(row.created_at)} · {row.filename}
            </p>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 py-8">
        {!fromSnapshot ? (
          <p className="mb-8 text-sm text-muted">
            這筆只存了法規必填。之後新送出的紀錄會含全部欄位。
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
            </section>
          )
        })}
      </main>
    </div>
  )
}
