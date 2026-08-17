import { useRef, useState } from 'react'
import { defaultParams } from '../hooks/useReviewSession'
import type { ExtractParams } from '../types'

type Props = {
  busy: boolean
  notice: string | null
  onStart: (file: File, params: ExtractParams) => void
}

export function UploadScreen({ busy, notice, onStart }: Props) {
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
      <p className="font-serif text-sm tracking-wide text-accent">essences</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight text-ink">
        把文件裡抽出來的欄位，看過再送出去。
      </h1>
      <p className="mt-4 text-base leading-7 text-ink-soft">
        解析要跑一段時間。過程中欄位會一筆一筆進來，你不用對著空白畫面等。必填沒補上，送不出去。
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
            {file ? file.name : '拖進來，或點這裡選檔。檢驗報告、規格表都可以。'}
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
          <summary className="cursor-pointer select-none hover:text-ink">測試用選項</summary>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              欄位數
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
              速度
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
              在第幾筆失敗
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
            欄位數 1–300。失敗填 0 以上會在該筆觸發後端 error；-1 表示不失敗。
          </p>
        </details>
      </form>
    </main>
  )
}
