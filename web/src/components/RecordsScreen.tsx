import { useCallback, useEffect, useState } from 'react'
import { listRequiredReviews, type SavedReview } from '../lib/reviews'

type Props = {
  onBack: () => void
}

function formatSavedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-TW', { hour12: false })
}

export function RecordsScreen({ onBack }: Props) {
  const [rows, setRows] = useState<SavedReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await listRequiredReviews())
    } catch (caught) {
      setRows([])
      setError(caught instanceof Error ? caught.message : '讀取失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-serif text-sm tracking-wide text-accent">essences</p>
          <h1 className="mt-2 font-serif text-4xl text-ink">已儲存紀錄</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-ink-soft">
            寫入 Supabase 的法規必填欄位：品名、有效日期、廠商名稱。新的在最上面。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-sm border border-line px-3 py-2 text-sm text-ink hover:bg-paper-2"
          >
            返回
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-sm bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {loading ? '讀取中…' : '重新整理'}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-8 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {!error && !loading && rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted">還沒有紀錄。審核完成並送出後會出現在這裡。</p>
      ) : null}

      {rows.length > 0 ? (
        <div className="mt-8 overflow-x-auto border-t border-line">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-3 pr-4 font-medium">儲存時間</th>
                <th className="py-3 pr-4 font-medium">文件</th>
                <th className="py-3 pr-4 font-medium">品名</th>
                <th className="py-3 pr-4 font-medium">有效日期</th>
                <th className="py-3 font-medium">廠商名稱</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line align-top">
                  <td className="py-3 pr-4 whitespace-nowrap text-muted">
                    {formatSavedAt(row.created_at)}
                  </td>
                  <td className="py-3 pr-4 text-ink">{row.filename}</td>
                  <td className="py-3 pr-4 text-ink">{row.product_name}</td>
                  <td className="py-3 pr-4 text-ink">{row.expiry_date}</td>
                  <td className="py-3 text-ink">{row.vendor_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {loading && rows.length === 0 && !error ? (
        <p className="mt-8 text-sm text-muted">正在讀取紀錄…</p>
      ) : null}
    </main>
  )
}
