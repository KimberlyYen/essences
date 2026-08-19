/**
 * 審核主畫面。
 * sticky header 永遠看得到「能不能送、缺哪個必填、解析到哪」。
 * 左邊篩選，右邊依群組列出欄位——不用表格分頁，才不會把同組拆開。
 */
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
    submitting,
    submitError,
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

  // 篩選後再分組，主清單才不會出現被濾掉的列
  const visibleGrouped = groupFields(visibleFields)
  // 還沒知道總數時先顯示百分比
  const progressLabel = extract.total
    ? `${extract.fields.length}/${extract.total}`
    : `${extract.progress}%`

  return (
    <div className="min-h-dvh">
      {/* sticky：往下捲時標題、進度、送出鍵還在 */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-serif text-lg text-ink">欄位審核</p>
            <p className="truncate text-sm text-muted">
              {filename}
              {extracting ? ` · ${extract.stage}` : extract.done ? ' · 解析完成' : null}
              {extract.cancelled ? ' · 已停止' : null}
            </p>
          </div>
          {/* 解析中只能停；停了之後改成重新上傳。送出鍵 disabled 時用 title 解釋原因 */}
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
                重新上傳
              </button>
            )}
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!ready || submitting}
              title={
                extracting
                  ? '解析進行中，完成後始可送出'
                  : submitting
                    ? '正在寫入 Supabase'
                    : ready
                      ? reviewCount > 0
                        ? `尚有 ${reviewCount} 項建議檢查，不影響送出`
                        : '送出審核結果'
                      : missing.length
                        ? `尚有必填欄位未填寫：${missing.join('、')}`
                        : '目前沒有可送出的欄位'
              }
              className="rounded-sm bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? '儲存中…' : '送出'}
            </button>
          </div>
        </div>

        {/* 解析進度。aria-live 讓螢幕閱讀器聽到階段變化，不用自己捲動去追 */}
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

        {/* 寫入 Supabase 失敗：留在這一頁，不要假裝已送出 */}
        {submitError ? (
          <div className="border-t border-danger/20 bg-danger-bg">
            <p className="mx-auto max-w-5xl px-4 py-2 text-sm text-danger">{submitError}</p>
          </div>
        ) : null}

        {/* 第一眼該看這裡：哪幾個法規必填還是空的 */}
        {missing.length > 0 ? (
          <div className="border-t border-danger/20 bg-danger-bg">
            <p className="mx-auto max-w-5xl px-4 py-2 text-sm text-danger">
              以下法規必填欄位尚未填寫，無法送出：{missing.join('、')}。
            </p>
          </div>
        ) : null}

        {/* 後端中途掛掉：已抽出的欄位還在，可以重試同一份 document_id */}
        {extract.error ? (
          <div className="border-t border-danger/20 bg-danger-bg">
            <p className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm text-danger">
              <span>
                解析中斷（{extract.error.code}）：{extract.error.message}
                {extract.fields.length ? '。已抽出的欄位可繼續編輯後送出，或重新解析。' : ''}
              </span>
              <button type="button" onClick={retryExtract} className="underline">
                重試
              </button>
            </p>
          </div>
        ) : null}

        {/* 使用者按停止：斷線後端就會停，這裡保留部分結果 */}
        {extract.cancelled && !extract.done ? (
          <div className="border-t border-line bg-paper-2">
            <p className="mx-auto max-w-5xl px-4 py-2 text-sm text-ink-soft">
              已停止解析。目前有 {extract.fields.length} 個欄位可繼續編輯，或重新上傳。
            </p>
          </div>
        ) : null}
      </header>

      {/* 左篩選、右清單。小螢幕改成上下排 */}
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-6 md:grid-cols-[13rem_1fr]">
        <aside className="md:sticky md:top-36 md:self-start">
          {/* 「需檢查」才是上百欄時的主路徑，不是搜尋欄位名 */}
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

          {/* 四個群組。數字後面的 ·N 是該組還有幾筆需檢查 */}
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
              // 解析中群組還沒到，仍顯示名稱，讓人知道四組都會出現
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
          {/* 還沒抽出第一筆時給一句話，不要空白畫面 */}
          {extract.fields.length === 0 && extracting ? (
            <p className="text-sm text-muted">正在解析文件，抽出的欄位將依群組顯示。</p>
          ) : null}

          {extract.fields.length === 0 && !extracting ? (
            <p className="text-sm text-muted">尚無欄位。請重新上傳或重試解析。</p>
          ) : null}

          {GROUPS.map((group) => {
            const fields = visibleGrouped.get(group) ?? []
            if (fields.length === 0) return null
            return (
              // 組名 sticky，上百欄往下捲時還知道自己在哪一組
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
            <p className="text-sm text-muted">沒有符合條件的欄位。</p>
          ) : null}
        </main>
      </div>
    </div>
  )
}

/** 篩選鈕：選中時反白，跟群組鈕共用 navClass。 */
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

/** 選中：深底淺字；沒選中：淺底。左右對齊給數字用。 */
function navClass(active: boolean) {
  return `flex w-full items-center justify-between whitespace-nowrap rounded-sm px-2 py-1.5 text-left text-sm ${
    active ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-paper-2'
  }`
}
