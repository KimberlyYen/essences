/**
 * 單一欄位列。九種資訊不平均攤開：
 * 主視覺是名稱 + 輸入框；必填用 *；缺漏 / 需確認才出標籤；頁碼降成 p.2；
 * 把握度不顯示百分比（低把握已經用左側色條跟「需確認」表達）。
 *
 * memo：父層每進來一筆 SSE 都會重畫清單。callback 是穩定的，沒改過的列可以跳過 render。
 */
import { memo } from 'react'
import type { ReviewField } from '../types'
import { fromDateInputValue, isDateFieldLabel, toDateInputValue } from '../lib/fields'

type Props = {
  field: ReviewField
  onChange: (id: string, value: string) => void
  onConfirm: (id: string) => void
  onPick: (id: string, value: string) => void
  onReset: (id: string) => void
}

/** 左側色條：紅=必填空、橘=需確認、無色=安靜的高把握列。 */
function tone(field: ReviewField): 'danger' | 'warn' | 'plain' {
  if (field.required && field.value.trim() === '') return 'danger'
  if (field.status === 'pending') return 'warn'
  return 'plain'
}

export const FieldRow = memo(function FieldRow({ field, onChange, onConfirm, onPick, onReset }: Props) {
  const kind = tone(field)
  const missing = field.required && field.value.trim() === ''
  const inputId = `field-${field.id}`
  const changed = field.value !== field.originalValue
  const dateField = isDateFieldLabel(field.label)

  return (
    <article
      id={`field-block-${field.id}`}
      className={`field-row scroll-mt-44 border-l-2 py-3 pl-3 pr-1 ${
        kind === 'danger'
          ? 'border-danger bg-danger-bg/60'
          : kind === 'warn'
            ? 'border-warn bg-warn-bg/50'
            : 'border-transparent'
      }`}
    >
      {/* 名稱是主標；* 只給必填，不做大徽章 */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
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
        <p className="flex items-center gap-2 text-xs text-muted">
          {missing ? <span className="text-danger">未填寫</span> : null}
          {!missing && field.status === 'pending' ? <span className="text-warn">需確認</span> : null}
          {field.status === 'edited' ? <span>已修改</span> : null}
          <span>p.{field.page}</span>
        </p>
      </div>

      {/* 有效日期等用系統日期選單；存進狀態仍是 2027/01/08，跟 mock / 測試一致 */}
      {dateField ? (
        <input
          id={inputId}
          type="date"
          value={toDateInputValue(field.value)}
          onChange={(event) => onChange(field.id, fromDateInputValue(event.target.value))}
          aria-required={field.required}
          aria-invalid={missing}
          className="mt-1.5 w-full min-h-11 scroll-mt-44 rounded-sm border border-line bg-card px-3 py-2 text-sm text-ink"
        />
      ) : (
        <input
          id={inputId}
          value={field.value}
          onChange={(event) => onChange(field.id, event.target.value)}
          aria-required={field.required}
          aria-invalid={missing}
          placeholder={missing ? '文件中未抽出，請自行填寫' : undefined}
          className="mt-1.5 w-full min-h-11 scroll-mt-44 rounded-sm border border-line bg-card px-3 py-2 text-sm text-ink"
        />
      )}

      {/* 約一成欄位才有候選。沒有就不佔空間 */}
      {field.candidates && field.candidates.length > 0 ? (
        <fieldset className="mt-2">
          <legend className="text-xs text-muted">系統抽出多個候選值，請選擇其一，或直接修改欄位內容</legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {field.candidates.map((candidate) => {
              // 已確認且值等於這個候選 → 實心；值相同但還沒確認 → 橘框
              const selected = field.value === candidate && field.status !== 'pending'
              return (
                <button
                  key={candidate}
                  type="button"
                  onClick={() => onPick(field.id, candidate)}
                  aria-pressed={field.value === candidate}
                  className={`min-h-11 rounded-sm border px-3 py-2 text-xs ${
                    selected
                      ? 'border-accent bg-paper-2 text-accent'
                      : field.value === candidate
                        ? 'border-accent/40 bg-card text-ink'
                        : 'border-line bg-card text-ink-soft hover:border-accent hover:text-ink'
                  }`}
                >
                  {candidate}
                </button>
              )
            })}
          </div>
        </fieldset>
      ) : null}

      {/* 高把握且沒改過：不顯示確認鈕，避免 120 列都要點一次 */}
      {field.status === 'pending' || changed ? (
        <div className="mt-2 flex gap-2">
          {field.status === 'pending' && !missing ? (
            <button
              type="button"
              onClick={() => onConfirm(field.id)}
              className="min-h-11 text-sm font-medium text-accent hover:underline"
            >
              確認
            </button>
          ) : null}
          {changed ? (
            <button
              type="button"
              onClick={() => onReset(field.id)}
              className="min-h-11 text-sm text-muted hover:text-ink hover:underline"
            >
              還原
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
})
