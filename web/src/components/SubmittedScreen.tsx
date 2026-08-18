import type { RequiredReviewRow } from '../lib/fields'
import type { ReviewField } from '../types'

type Props = {
  filename: string
  fields: ReviewField[]
  saved: RequiredReviewRow | null
  onAgain: () => void
  onViewRecords: () => void
}

export function SubmittedScreen({ filename, fields, saved, onAgain, onViewRecords }: Props) {
  const edited = fields.filter((field) => field.status === 'edited').length
  const pending = fields.filter((field) => field.status === 'pending').length

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-16">
      <p className="font-serif text-sm text-accent">已送出</p>
      <h1 className="mt-3 font-serif text-4xl text-ink">審核結果已寫入 Supabase</h1>
      <p className="mt-4 text-base leading-7 text-ink-soft">
        本次只儲存法規必填欄位：品名、有效日期、廠商名稱。
      </p>
      <dl className="mt-8 grid grid-cols-1 gap-4 text-sm">
        <div>
          <dt className="text-muted">文件</dt>
          <dd className="mt-1 text-ink">{saved?.filename ?? filename}</dd>
        </div>
        <div>
          <dt className="text-muted">品名</dt>
          <dd className="mt-1 text-ink">{saved?.product_name ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted">有效日期</dt>
          <dd className="mt-1 text-ink">{saved?.expiry_date ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted">廠商名稱</dt>
          <dd className="mt-1 text-ink">{saved?.vendor_name ?? '—'}</dd>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <dt className="text-muted">全部欄位數</dt>
            <dd className="mt-1 text-ink">{fields.length}</dd>
          </div>
          <div>
            <dt className="text-muted">已修改 / 未確認</dt>
            <dd className="mt-1 text-ink">
              {edited} / {pending}
            </dd>
          </div>
        </div>
      </dl>
      <div className="mt-10 flex flex-col gap-3">
        <button
          type="button"
          onClick={onViewRecords}
          className="rounded-sm bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent-hover"
        >
          查看已儲存紀錄
        </button>
        <button
          type="button"
          onClick={onAgain}
          className="rounded-sm border border-line px-4 py-3 text-sm text-ink hover:bg-paper-2"
        >
          上傳新文件
        </button>
      </div>
    </main>
  )
}
