/**
 * 測試報告頁。
 * 「執行測試」逐條跑同一批契約測試；綠=通過，紅=改壞了。
 */
import { useEffect, useRef, useState } from 'react'
import { TEST_COUNT, TEST_GROUPS } from '../lib/testReport'
import {
  CONTRACT_TESTS,
  runOneContractTest,
  type ContractTestResult,
} from '../lib/contractTests'

type Props = {
  onBack: () => void
}

function namesMatch(left: string, right: string): boolean {
  return left === right || left.startsWith(right) || right.startsWith(left)
}

function matchResult(itemName: string, results: ContractTestResult[]): ContractTestResult | undefined {
  return results.find((item) => namesMatch(item.name, itemName))
}

function catalogCardId(testName: string): string | null {
  for (const group of TEST_GROUPS) {
    for (const item of group.cases) {
      if (namesMatch(item.name, testName)) return item.id
    }
  }
  return null
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function TestReportScreen({ onBack }: Props) {
  const [running, setRunning] = useState(false)
  const [currentName, setCurrentName] = useState<string | null>(null)
  const [progress, setProgress] = useState({ done: 0, total: CONTRACT_TESTS.length })
  const [summary, setSummary] = useState<{ passed: number; failed: number } | null>(null)
  const [results, setResults] = useState<ContractTestResult[]>([])
  const cancelled = useRef(false)

  useEffect(() => {
    cancelled.current = false
    return () => {
      cancelled.current = true
    }
  }, [])

  async function runTests() {
    cancelled.current = false
    setRunning(true)
    setSummary(null)
    setResults([])
    setCurrentName(null)
    setProgress({ done: 0, total: CONTRACT_TESTS.length })

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const pause = reduceMotion ? 0 : 220
    const collected: ContractTestResult[] = []

    for (let index = 0; index < CONTRACT_TESTS.length; index += 1) {
      if (cancelled.current) return
      const test = CONTRACT_TESTS[index]
      setCurrentName(test.name)
      setProgress({ done: index, total: CONTRACT_TESTS.length })

      const cardId = catalogCardId(test.name)
      if (cardId) {
        document.getElementById(`test-card-${cardId}`)?.scrollIntoView({
          block: 'center',
          behavior: reduceMotion ? 'auto' : 'smooth',
        })
      }

      if (pause) await delay(pause)
      if (cancelled.current) return

      collected.push(runOneContractTest(test))
      setResults([...collected])
      setProgress({ done: index + 1, total: CONTRACT_TESTS.length })
      if (pause) await delay(140)
    }

    if (cancelled.current) return
    setCurrentName(null)
    setSummary({
      passed: collected.filter((item) => item.ok).length,
      failed: collected.filter((item) => !item.ok).length,
    })
    setRunning(false)
  }

  const allPassed = summary !== null && summary.failed === 0
  const percent = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100)

  return (
    <div className="min-h-dvh pb-[max(2.5rem,env(safe-area-inset-bottom))]">
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
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-lg text-ink">測試報告</p>
            <p className="truncate text-xs text-muted" aria-live="polite">
              {running
                ? `${progress.done + (currentName ? 1 : 0)} / ${progress.total} · ${currentName ?? '準備中'}`
                : `共 ${TEST_COUNT} 支說明 · 實際 ${CONTRACT_TESTS.length} 支可在這頁跑`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void runTests()}
            disabled={running}
            className="min-h-11 shrink-0 rounded-sm bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {running ? '執行中…' : '執行測試'}
          </button>
        </div>
        {running ? (
          <div className="mx-auto max-w-5xl px-4 pb-3">
            <div
              className="h-1 overflow-hidden rounded-full bg-paper-2"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label="測試進度"
            >
              <div className="progress-fill h-full bg-accent transition-[width] duration-300" style={{ width: `${percent}%` }} />
            </div>
          </div>
        ) : null}
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 py-8">
        <p className="max-w-2xl font-serif text-2xl leading-snug text-ink sm:text-3xl">
          哪天有人改壞了，這支測試會不會紅。
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
          按「執行測試」會一張一張跑過去。通過是綠的；失敗（紅）代表有人改壞了鎖住的行為。
        </p>

        {summary ? (
          <p className={`mt-6 text-sm font-medium ${allPassed ? 'text-accent' : 'text-danger'}`} role="status">
            {allPassed
              ? `全過：${summary.passed} 支通過。`
              : `${summary.failed} 支失敗、${summary.passed} 支通過。失敗的卡片右邊會標出來。`}
          </p>
        ) : running ? (
          <p className="mt-6 text-sm text-ink-soft" role="status">
            正在測：{currentName}
          </p>
        ) : (
          <p className="mt-6 text-sm text-muted">還沒跑。按右上角「執行測試」。終端機仍可用 `cd web && npm test`。</p>
        )}

        <div className="mt-10 space-y-14">
          {TEST_GROUPS.map((group) => (
            <section key={group.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink pb-2">
                <h2 className="font-serif text-xl text-ink">{group.title}</h2>
                <p className="font-mono text-xs text-muted">{group.file}</p>
              </div>

              <ol className="mt-4 grid gap-3">
                {group.cases.map((item, index) => {
                  const result = matchResult(item.name, results)
                  const current = Boolean(currentName && namesMatch(item.name, currentName) && !result)
                  return (
                    <li
                      id={`test-card-${item.id}`}
                      key={item.id}
                      className={`overflow-hidden rounded-sm border bg-card md:grid md:grid-cols-2 ${
                        current
                          ? 'test-card-run border-accent'
                          : result?.ok === false
                            ? 'border-danger'
                            : result?.ok
                              ? 'border-accent/40'
                              : 'border-line'
                      }`}
                    >
                      <div className="border-b border-line px-4 py-4 md:border-b-0 md:border-r">
                        <p className="text-xs tracking-wide text-muted">
                          {String(index + 1).padStart(2, '0')} · 防的是
                          {current ? ' · 正在測' : result ? (result.ok ? ' · 通過' : ' · 失敗') : ''}
                        </p>
                        <p className="mt-2 text-sm font-medium leading-6 text-ink">{item.name}</p>
                        <p className="mt-2 text-sm leading-6 text-ink-soft">{item.guards}</p>
                      </div>
                      <div className={`px-4 py-4 ${result?.ok === false ? 'bg-danger-bg' : 'bg-danger-bg/70'}`}>
                        <p className="text-xs tracking-wide text-danger">改壞就會紅</p>
                        <p className="mt-2 text-sm leading-6 text-ink">{item.breaksIf}</p>
                        {result?.error ? (
                          <p className="mt-3 font-mono text-xs leading-5 text-danger">{result.error}</p>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
