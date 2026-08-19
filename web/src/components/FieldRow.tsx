/**
 * 單一欄位列。九種資訊不平均攤開：
 * 主視覺是名稱 + 輸入框；必填用 *；缺漏 / 需確認才出標籤；頁碼降成 p.2；
 * 把握度不顯示百分比（低把握已經用左側色條跟「需確認」表達）。
 *
 * memo：父層每進來一筆 SSE 都會重畫清單。callback 是穩定的，沒改過的列可以跳過 render。
 */
import { memo } from 'react'
import type { ReviewField } from '../types'

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

  return (
    <article
      className={`field-row border-l-2 py-3 pl-3 pr-1 ${
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
            <span className="ml-1 text-danger" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        <p className="flex items-center gap-2 text-xs text-muted">
          {missing ? <span className="text-danger">未填寫</span> : null}
          {!missing && field.status === 'pending' ? <span className="text-warn">需確認</span> : null}
          {field.status === 'edited' ? <span>已修改</span> : null}
          <span>p.{field.page}</span>
        </p>
      </div>

      {/* 值本身就是輸入框，不必再另開「編輯模式」 */}
      <input
        id={inputId}
        value={field.value}
        onChange={(event) => onChange(field.id, event.target.value)}
        aria-required={field.required}
        aria-invalid={missing}
        placeholder={missing ? '文件中未抽出，請自行填寫' : undefined}
        className="mt-1.5 w-full rounded-sm border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
      />

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
                  className={`rounded-sm border px-2 py-1 text-xs ${
                    selected
                      ? 'border-ink bg-ink text-paper'
                      : field.value === candidate
                        ? 'border-warn text-ink'
                        : 'border-line text-ink-soft hover:border-ink'
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
              className="text-xs font-medium text-accent hover:underline"
            >
              確認
            </button>
          ) : null}
          {changed ? (
            <button
              type="button"
              onClick={() => onReset(field.id)}
              className="text-xs text-muted hover:text-ink hover:underline"
            >
              還原
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
})
