/**
 * 從 Supabase 把 reviews 列出來。
 * 進頁就 load 一次；「重新整理」再打一次，方便剛送出後立刻核對。
 */
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

  // 進頁、按重新整理都走同一條
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

  // 掛上就讀一次；load 穩定所以只跑一次
  useEffect(() => {
    void load()
  }, [load])

  return (
    <main id="main" className="mx-auto min-h-dvh max-w-5xl px-5 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-serif text-sm tracking-wide text-accent">essences</p>
          <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">已儲存紀錄</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-ink-soft">
            寫入 Supabase 的法規必填欄位：品名、有效日期、廠商名稱。新的在最上面。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="min-h-11 rounded-sm border border-line px-3 py-2 text-sm text-ink hover:bg-paper-2"
          >
            返回
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="min-h-11 rounded-sm bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
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

      {/* 表在、政策對、只是還沒送過 */}
      {!error && !loading && rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted">還沒有紀錄。審核完成並送出後會出現在這裡。</p>
      ) : null}

      {rows.length > 0 ? (
        <>
          {/* 手機：一筆一張卡，不要橫向捲五欄表 */}
          <ul className="mt-8 space-y-4 md:hidden">
            {rows.map((row) => (
              <li key={row.id} className="rounded-sm border border-line bg-card px-4 py-3 text-sm">
                <p className="text-xs text-muted">{formatSavedAt(row.created_at)}</p>
                <p className="mt-1 font-medium text-ink">{row.product_name}</p>
                <dl className="mt-2 grid gap-1 text-ink-soft">
                  <div className="flex justify-between gap-3">
                    <dt>有效日期</dt>
                    <dd className="text-ink">{row.expiry_date}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>廠商名稱</dt>
                    <dd className="text-right text-ink">{row.vendor_name}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>文件</dt>
                    <dd className="truncate text-right">{row.filename}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          <div className="mt-8 hidden overflow-x-auto border-t border-line md:block">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">已儲存的法規必填紀錄</caption>
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
        </>
      ) : null}

      {loading && rows.length === 0 && !error ? (
        <p className="mt-8 text-sm text-muted">正在讀取紀錄…</p>
      ) : null}
    </main>
  )
}
