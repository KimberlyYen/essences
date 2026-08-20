/**
 * 測試報告頁。
 * 不跑 vitest。版面改成固定頂欄 + 左右對照卡：左邊防什麼、右邊怎樣改會紅。
 */
import { TEST_COUNT, TEST_GROUPS } from '../lib/testReport'

type Props = {
  onBack: () => void
}

export function TestReportScreen({ onBack }: Props) {
  return (
    <div className="min-h-dvh pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      {/* 捲再下面也看得到上一頁，不要把返回藏在標題右側 */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-line px-3 py-2 text-sm text-ink hover:bg-paper-2"
          >
            <span aria-hidden="true">←</span>
            上一頁
          </button>
          <div className="min-w-0">
            <p className="truncate font-serif text-lg text-ink">測試報告</p>
            <p className="truncate text-xs text-muted">共 {TEST_COUNT} 支 · npm test</p>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 py-8">
        <p className="max-w-2xl font-serif text-2xl leading-snug text-ink sm:text-3xl">
          哪天有人改壞了，這支測試會不會紅。
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
          數量不重要。每張卡左邊是它鎖住的規則，右邊是怎樣改就會紅。
        </p>

        <div className="mt-10 space-y-14">
          {TEST_GROUPS.map((group) => (
            <section key={group.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink pb-2">
                <h2 className="font-serif text-xl text-ink">{group.title}</h2>
                <p className="font-mono text-xs text-muted">{group.file}</p>
              </div>

              <ol className="mt-4 grid gap-3">
                {group.cases.map((item, index) => (
                  <li
                    key={item.id}
                    className="overflow-hidden rounded-sm border border-line bg-card md:grid md:grid-cols-2"
                  >
                    <div className="border-b border-line px-4 py-4 md:border-b-0 md:border-r">
                      <p className="text-xs tracking-wide text-muted">
                        {String(index + 1).padStart(2, '0')} · 防的是
                      </p>
                      <p className="mt-2 text-sm font-medium leading-6 text-ink">{item.name}</p>
                      <p className="mt-2 text-sm leading-6 text-ink-soft">{item.guards}</p>
                    </div>
                    <div className="bg-danger-bg/70 px-4 py-4">
                      <p className="text-xs tracking-wide text-danger">改壞就會紅</p>
                      <p className="mt-2 text-sm leading-6 text-ink">{item.breaksIf}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
