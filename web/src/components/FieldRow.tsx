import { memo } from 'react'
import type { ReviewField } from '../types'

type Props = {
  field: ReviewField
  onChange: (id: string, value: string) => void
  onConfirm: (id: string) => void
  onPick: (id: string, value: string) => void
  onReset: (id: string) => void
}

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
          {missing ? <span className="text-danger">請補上</span> : null}
          {!missing && field.status === 'pending' ? <span className="text-warn">需確認</span> : null}
          {field.status === 'edited' ? <span>已改過</span> : null}
          <span>p.{field.page}</span>
        </p>
      </div>

      <input
        id={inputId}
        value={field.value}
        onChange={(event) => onChange(field.id, event.target.value)}
        aria-required={field.required}
        aria-invalid={missing}
        placeholder={missing ? '文件裡沒抽到，請填' : undefined}
        className="mt-1.5 w-full rounded-sm border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
      />

      {field.candidates && field.candidates.length > 0 ? (
        <fieldset className="mt-2">
          <legend className="text-xs text-muted">系統抓到不只一個值，選一個，或自己改上面那欄</legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {field.candidates.map((candidate) => {
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

      {field.status === 'pending' || changed ? (
        <div className="mt-2 flex gap-2">
          {field.status === 'pending' && !missing ? (
            <button
              type="button"
              onClick={() => onConfirm(field.id)}
              className="text-xs font-medium text-accent hover:underline"
            >
              確認無誤
            </button>
          ) : null}
          {changed ? (
            <button
              type="button"
              onClick={() => onReset(field.id)}
              className="text-xs text-muted hover:text-ink hover:underline"
            >
              回到抽出值
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
})
