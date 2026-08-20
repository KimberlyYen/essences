/**
 * 從 Supabase 把 reviews 列出來。
 * 清單只顯示三個必填；點進去才看全部欄位。
 */
import { useCallback, useEffect, useState } from 'react'
import { deleteSavedReview, listRequiredReviews, type SavedReview } from '../lib/reviews'
import { RecordDetail } from './RecordDetail'

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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  async function remove(row: SavedReview) {
    if (deletingId) return
    const label = row.product_name.trim() || row.filename
    if (!window.confirm(`確定刪除「${label}」這筆紀錄？`)) return
    setDeletingId(row.id)
    setError(null)
    try {
      await deleteSavedReview(row.id)
      setRows((current) => current.filter((item) => item.id !== row.id))
      if (selectedId === row.id) setSelectedId(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '刪除失敗')
    } finally {
      setDeletingId(null)
    }
  }

  const selected = rows.find((row) => row.id === selectedId) ?? null
  if (selected) {
    return (
      <RecordDetail
        row={selected}
        onBack={() => setSelectedId(null)}
        onSaved={(updated) => {
          setRows((current) => current.map((item) => (item.id === updated.id ? updated : item)))
        }}
        onDeleted={() => {
          setRows((current) => current.filter((item) => item.id !== selected.id))
          setSelectedId(null)
        }}
      />
    )
  }

  return (
    <main id="main" className="mx-auto min-h-dvh max-w-5xl px-5 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-serif text-sm tracking-wide text-accent">essences</p>
          <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">已儲存紀錄</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-ink-soft">
            清單是法規必填摘要。點進去可查看、編輯後再儲存。新的在最上面。
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

      {!error && !loading && rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted">還沒有紀錄。審核完成並送出後會出現在這裡。</p>
      ) : null}

      {rows.length > 0 ? (
        <>
          <ul className="mt-8 space-y-4 md:hidden">
            {rows.map((row) => (
              <li key={row.id} className="rounded-sm border border-line bg-card">
                <button
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-paper-2"
                >
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
                  <p className="mt-3 text-xs text-accent">查看詳細欄位</p>
                </button>
                <div className="flex justify-end border-t border-line px-4 py-2">
                  <button
                    type="button"
                    onClick={() => void remove(row)}
                    disabled={deletingId === row.id}
                    className="min-h-11 rounded-sm border border-danger/30 px-3 py-2 text-sm text-danger hover:bg-danger-bg disabled:opacity-40"
                  >
                    {deletingId === row.id ? '刪除中…' : '刪除'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-8 hidden overflow-x-auto border-t border-line md:block">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">已儲存的審核紀錄，點列可看詳細欄位</caption>
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="py-3 pr-4 font-medium">儲存時間</th>
                  <th className="py-3 pr-4 font-medium">文件</th>
                  <th className="py-3 pr-4 font-medium">品名</th>
                  <th className="py-3 pr-4 font-medium">有效日期</th>
                  <th className="py-3 pr-4 font-medium">廠商名稱</th>
                  <th className="py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-line align-top hover:bg-paper-2"
                    tabIndex={0}
                    onClick={() => setSelectedId(row.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedId(row.id)
                      }
                    }}
                  >
                    <td className="py-3 pr-4 whitespace-nowrap text-muted">
                      {formatSavedAt(row.created_at)}
                    </td>
                    <td className="py-3 pr-4 text-ink">{row.filename}</td>
                    <td className="py-3 pr-4 text-ink">{row.product_name}</td>
                    <td className="py-3 pr-4 text-ink">{row.expiry_date}</td>
                    <td className="py-3 pr-4 text-ink">{row.vendor_name}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelectedId(row.id)
                          }}
                          onKeyDown={(event) => event.stopPropagation()}
                          className="min-h-11 rounded-sm border border-line bg-card px-3 py-2 text-sm text-ink hover:bg-paper-2"
                        >
                          詳細
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void remove(row)
                          }}
                          onKeyDown={(event) => event.stopPropagation()}
                          disabled={deletingId === row.id}
                          className="min-h-11 rounded-sm border border-danger/30 px-3 py-2 text-sm text-danger hover:bg-danger-bg disabled:opacity-40"
                        >
                          {deletingId === row.id ? '刪除中…' : '刪除'}
                        </button>
                      </div>
                    </td>
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
