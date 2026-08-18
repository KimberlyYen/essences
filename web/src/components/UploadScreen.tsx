import { useRef, useState } from 'react'
import { defaultParams } from '../hooks/useReviewSession'
import type { ExtractParams } from '../types'

type Props = {
  busy: boolean
  notice: string | null
  onStart: (file: File, params: ExtractParams) => void
  onViewRecords: () => void
}

export function UploadScreen({ busy, notice, onStart, onViewRecords }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [params, setParams] = useState<ExtractParams>(defaultParams)

  function takeFile(next: File | null) {
    if (!next) return
    setFile(next)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5 py-16">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-serif text-sm tracking-wide text-accent">essences</p>
        <button
          type="button"
          onClick={onViewRecords}
          className="text-sm text-accent hover:underline"
        >
          已儲存紀錄
        </button>
      </div>
      <h1 className="mt-3 font-serif text-4xl leading-tight text-ink">文件欄位審核</h1>
      <p className="mt-4 text-base leading-7 text-ink-soft">
        上傳文件後，系統會解析並依群組帶出欄位。解析期間即可檢視與修改。品名、有效日期、廠商名稱為法規必填，未填寫無法送出。
      </p>

      <form
        className="mt-10"
        onSubmit={(event) => {
          event.preventDefault()
          if (file) onStart(file, params)
        }}
      >
        <label
          onDragEnter={(event) => {
            event.preventDefault()
            setDragOver(true)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragOver(false)
            takeFile(event.dataTransfer.files[0] ?? null)
          }}
          className={`flex cursor-pointer flex-col items-start gap-2 rounded-sm border border-dashed px-5 py-8 transition ${
            dragOver ? 'border-accent bg-paper-2' : 'border-line bg-card'
          }`}
        >
          <span className="text-sm font-medium text-ink">上傳文件</span>
          <span className="text-sm text-muted">
            {file ? file.name : '點選或將檔案拖曳至此。適用檢驗報告、產品規格表等文件。'}
          </span>
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            onChange={(event) => takeFile(event.target.files?.[0] ?? null)}
          />
        </label>

        {notice ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            {notice}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!file || busy}
          className="mt-6 w-full rounded-sm bg-accent px-4 py-3 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? '上傳中…' : '開始解析'}
        </button>

        <details className="mt-8 text-sm text-muted">
          <summary className="cursor-pointer select-none hover:text-ink">測試選項</summary>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              欄位數量
              <input
                type="number"
                min={1}
                max={300}
                className="rounded-sm border border-line bg-card px-2 py-1.5 text-ink"
                value={params.field_count}
                onChange={(event) =>
                  setParams((current) => ({
                    ...current,
                    field_count: Number(event.target.value) || 1,
                  }))
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              速度倍率
              <input
                type="number"
                min={0.1}
                step={0.1}
                className="rounded-sm border border-line bg-card px-2 py-1.5 text-ink"
                value={params.speed}
                onChange={(event) =>
                  setParams((current) => ({
                    ...current,
                    speed: Number(event.target.value) || 1,
                  }))
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              於第 N 筆失敗
              <input
                type="number"
                min={-1}
                className="rounded-sm border border-line bg-card px-2 py-1.5 text-ink"
                value={params.fail_at}
                onChange={(event) =>
                  setParams((current) => ({
                    ...current,
                    fail_at: Number(event.target.value),
                  }))
                }
              />
            </label>
          </div>
          <p className="mt-2 text-xs leading-5">
            欄位數量 1–300。於第 N 筆失敗填 0 以上會觸發後端錯誤；-1 表示不啟用。
          </p>
        </details>
      </form>
    </main>
  )
}
