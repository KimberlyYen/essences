import { GROUPS, type FilterId } from '../types'
import { FieldRow } from './FieldRow'
import type { ReviewSession } from '../hooks/useReviewSession'
import { groupFields, needsReview } from '../lib/fields'

type Props = {
  session: ReviewSession
}

export function Workspace({ session }: Props) {
  const {
    filename,
    extract,
    filter,
    activeGroup,
    grouped,
    visibleFields,
    reviewCount,
    missing,
    ready,
    extracting,
    cancelExtract,
    retryExtract,
    resetToUpload,
    setFilter,
    setActiveGroup,
    setFieldValue,
    confirmField,
    chooseCandidate,
    revertField,
    submit,
  } = session

  const visibleGrouped = groupFields(visibleFields)
  const progressLabel = extract.total
    ? `${extract.fields.length}/${extract.total}`
    : `${extract.progress}%`

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-serif text-lg text-ink">審核抽出欄位</p>
            <p className="truncate text-sm text-muted">
              {filename}
              {extracting ? ` · ${extract.stage}` : extract.done ? ' · 解析完成' : null}
              {extract.cancelled ? ' · 已停止' : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {extracting ? (
              <button
                type="button"
                onClick={cancelExtract}
                className="rounded-sm border border-line px-3 py-2 text-sm text-ink hover:bg-paper-2"
              >
                停止解析
              </button>
            ) : (
              <button
                type="button"
                onClick={resetToUpload}
                className="rounded-sm border border-line px-3 py-2 text-sm text-ink hover:bg-paper-2"
              >
                換一份文件
              </button>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={!ready}
              title={
                extracting
                  ? '解析還在跑，結束後才能送出'
                  : ready
                    ? reviewCount > 0
                      ? `還有 ${reviewCount} 項建議檢查，不會擋送出`
                      : '送出審核結果'
                    : missing.length
                      ? `還有必填沒填：${missing.join('、')}`
                      : '還沒有可送出的欄位'
              }
              className="rounded-sm bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              送出
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-3">
          <div
            className="h-1 overflow-hidden rounded-full bg-paper-2"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={extract.progress}
            aria-label={extract.stage}
          >
            <div
              className="h-full bg-accent transition-[width] duration-300"
              style={{ width: `${Math.min(extract.progress, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted" aria-live="polite">
            {extract.stage}
            {extracting ? ` · 已抽出 ${progressLabel}` : null}
            {!extracting && extract.fields.length ? ` · ${extract.fields.length} 個欄位` : null}
          </p>
        </div>

        {missing.length > 0 ? (
          <div className="border-t border-danger/20 bg-danger-bg">
            <p className="mx-auto max-w-5xl px-4 py-2 text-sm text-danger">
              必填還沒填：{missing.join('、')}。這幾項不補，送不出去。
            </p>
          </div>
        ) : null}

        {extract.error ? (
          <div className="border-t border-danger/20 bg-danger-bg">
            <p className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm text-danger">
              <span>
                解析中途失敗（{extract.error.code}）：{extract.error.message}
                {extract.fields.length ? '。已抽出的欄位還在，可以改完再送，或重試。' : ''}
              </span>
              <button type="button" onClick={retryExtract} className="underline">
                重試
              </button>
            </p>
          </div>
        ) : null}

        {extract.cancelled && !extract.done ? (
          <div className="border-t border-line bg-paper-2">
            <p className="mx-auto max-w-5xl px-4 py-2 text-sm text-ink-soft">
              你停了解析。已抽出 {extract.fields.length} 個欄位，可以接著改，或換一份文件。
            </p>
          </div>
        ) : null}
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-6 md:grid-cols-[13rem_1fr]">
        <aside className="md:sticky md:top-36 md:self-start">
          <nav aria-label="篩選" className="flex gap-2 overflow-x-auto md:flex-col md:gap-1">
            <FilterButton
              current={filter}
              id="all"
              onClick={setFilter}
              label={`全部 ${extract.fields.length}`}
            />
            <FilterButton
              current={filter}
              id="review"
              onClick={setFilter}
              label={`需檢查 ${reviewCount}`}
            />
            <FilterButton
              current={filter}
              id="required"
              onClick={setFilter}
              label={`必填 ${extract.fields.filter((field) => field.required).length}`}
            />
          </nav>

          <nav aria-label="欄位群組" className="mt-5 flex gap-2 overflow-x-auto md:flex-col md:gap-1">
            <button
              type="button"
              onClick={() => setActiveGroup('all')}
              className={navClass(activeGroup === 'all')}
            >
              所有群組
            </button>
            {GROUPS.map((group) => {
              const count = grouped.get(group)?.length ?? 0
              const reviewInGroup = grouped.get(group)?.filter(needsReview).length ?? 0
              if (count === 0 && extracting) {
                return (
                  <p key={group} className="px-2 py-1 text-sm text-muted">
                    {group}
                  </p>
                )
              }
              if (count === 0) return null
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => setActiveGroup(group)}
                  className={navClass(activeGroup === group)}
                >
                  <span>{group}</span>
                  <span className="text-muted">
                    {count}
                    {reviewInGroup ? ` · ${reviewInGroup}` : ''}
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        <main>
          {extract.fields.length === 0 && extracting ? (
            <p className="text-sm text-muted">正在辨識文件，欄位出現後會依群組排進來。</p>
          ) : null}

          {extract.fields.length === 0 && !extracting ? (
            <p className="text-sm text-muted">還沒有欄位。重新上傳，或按重試。</p>
          ) : null}

          {GROUPS.map((group) => {
            const fields = visibleGrouped.get(group) ?? []
            if (fields.length === 0) return null
            return (
              <section key={group} id={`group-${group}`} className="mb-10">
                <h2 className="sticky top-[8.5rem] z-10 -mx-1 mb-2 bg-paper/95 px-1 py-2 font-serif text-xl text-ink backdrop-blur">
                  {group}
                  <span className="ml-2 font-sans text-sm text-muted">{fields.length}</span>
                </h2>
                <div className="divide-y divide-line">
                  {fields.map((field) => (
                    <FieldRow
                      key={field.id}
                      field={field}
                      onChange={setFieldValue}
                      onConfirm={confirmField}
                      onPick={chooseCandidate}
                      onReset={revertField}
                    />
                  ))}
                </div>
              </section>
            )
          })}

          {extract.fields.length > 0 && visibleFields.length === 0 ? (
            <p className="text-sm text-muted">這個篩選底下沒有欄位。</p>
          ) : null}
        </main>
      </div>
    </div>
  )
}

function FilterButton({
  current,
  id,
  label,
  onClick,
}: {
  current: FilterId
  id: FilterId
  label: string
  onClick: (id: FilterId) => void
}) {
  return (
    <button type="button" onClick={() => onClick(id)} className={navClass(current === id)}>
      {label}
    </button>
  )
}

function navClass(active: boolean) {
  return `flex w-full items-center justify-between whitespace-nowrap rounded-sm px-2 py-1.5 text-left text-sm ${
    active ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-paper-2'
  }`
}
