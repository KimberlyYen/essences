import type { ReviewField } from '../types'

type Props = {
  filename: string
  fields: ReviewField[]
  onAgain: () => void
}

export function SubmittedScreen({ filename, fields, onAgain }: Props) {
  const edited = fields.filter((field) => field.status === 'edited').length
  const pending = fields.filter((field) => field.status === 'pending').length

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-16">
      <p className="font-serif text-sm text-accent">已送出</p>
      <h1 className="mt-3 font-serif text-4xl text-ink">這份審核結果先停在瀏覽器裡。</h1>
      <p className="mt-4 text-base leading-7 text-ink-soft">
        後端沒有儲存 API，所以沒有真的寫進資料庫。送出前有擋必填空白。
      </p>
      <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-muted">文件</dt>
          <dd className="mt-1 text-ink">{filename}</dd>
        </div>
        <div>
          <dt className="text-muted">欄位數</dt>
          <dd className="mt-1 text-ink">{fields.length}</dd>
        </div>
        <div>
          <dt className="text-muted">改過</dt>
          <dd className="mt-1 text-ink">{edited}</dd>
        </div>
        <div>
          <dt className="text-muted">建議檢查但沒點確認</dt>
          <dd className="mt-1 text-ink">{pending}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={onAgain}
        className="mt-10 rounded-sm bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent-hover"
      >
        再傳一份
      </button>
    </main>
  )
}
