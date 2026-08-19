/**
 * 測試報告頁。
 * 不跑 vitest，只說明每支測試防什麼、怎樣改會紅。對應題目「數量不重要」。
 */
import { TEST_COUNT, TEST_GROUPS } from '../lib/testReport'

type Props = {
  onBack: () => void
}

export function TestReportScreen({ onBack }: Props) {
  return (
    <main id="main" className="mx-auto min-h-dvh max-w-3xl px-5 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-serif text-sm tracking-wide text-accent">essences</p>
          <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">測試報告</h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-ink-soft">
            哪天有人改壞了，這支測試會不會紅。數量不重要。
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded-sm border border-line px-3 py-2 text-sm text-ink hover:bg-paper-2"
        >
          返回
        </button>
      </div>

      <p className="mt-6 text-sm text-muted">
        共 {TEST_COUNT} 支，都在純函式上。本機驗證：在 <code className="text-ink">web</code> 跑{' '}
        <code className="text-ink">npm test</code>。
      </p>

      <div className="mt-10 space-y-12">
        {TEST_GROUPS.map((group) => (
          <section key={group.id}>
            <h2 className="font-serif text-xl text-ink">{group.title}</h2>
            <p className="mt-1 text-xs text-muted">{group.file}</p>
            <ol className="mt-4 divide-y divide-line border-t border-line">
              {group.cases.map((item, index) => (
                <li key={item.id} className="py-4">
                  <p className="text-sm font-medium text-ink">
                    {index + 1}. {item.name}
                  </p>
                  <dl className="mt-2 grid gap-2 text-sm leading-6">
                    <div>
                      <dt className="text-muted">防的是</dt>
                      <dd className="text-ink-soft">{item.guards}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">改壞就會紅</dt>
                      <dd className="text-ink-soft">{item.breaksIf}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </main>
  )
}
