/**
 * 整次「上傳 → 解析 → 審核 → 送出」的狀態都在這個 hook。
 * 畫面元件只負責畫，不自己打 API。
 */
import { useCallback, useMemo, useRef, useState } from 'react'
import { streamExtract, uploadDocument } from '../lib/api'
import { saveRequiredReview } from '../lib/reviews'
import {
  acceptField,
  canSubmit,
  groupFields,
  missingRequiredLabels,
  needsReview,
  payloadForSubmit,
  pickCandidate,
  resetField,
  updateFieldValue,
  type RequiredReviewRow,
} from '../lib/fields'
import { initialExtractState, reduceExtract } from '../lib/sse'
import type { ExtractParams, ExtractState, FilterId, Group, ReviewField } from '../types'
import { GROUPS } from '../types'

export type Phase = 'upload' | 'working' | 'submitted'

/** 對應 mock 後端預設：18 欄、正常速度、不故意失敗。 */
export const defaultParams: ExtractParams = {
  field_count: 18,
  speed: 1,
  fail_at: -1,
}

export function useReviewSession() {
  // phase 決定現在是上傳、審核還是已送出
  const [phase, setPhase] = useState<Phase>('upload')
  const [filename, setFilename] = useState('')
  // 重試解析時還要用同一個 id
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [params, setParams] = useState<ExtractParams>(defaultParams)
  const [extract, setExtract] = useState<ExtractState>(initialExtractState)
  const [filter, setFilter] = useState<FilterId>('all')
  const [activeGroup, setActiveGroup] = useState<Group | 'all'>('all')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [savedReview, setSavedReview] = useState<RequiredReviewRow | null>(null)
  // 用來中止 SSE。ref 才不會因為 re-render 丢掉 AbortController。
  const abortRef = useRef<AbortController | null>(null)

  /** 對同一個 document_id 開 SSE。新的一次會先 abort 舊的，避免兩條串流同時改 state。 */
  const runExtract = useCallback(async (id: string, extractParams: ExtractParams) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setExtract(initialExtractState)
    setNotice(null)
    setBusy(true)
    setPhase('working')

    try {
      await streamExtract(
        id,
        extractParams,
        (event) => {
          setExtract((current) => reduceExtract(current, event))
        },
        controller.signal,
      )
    } catch (error) {
      if (controller.signal.aborted) {
        setExtract((current) => ({ ...current, cancelled: true }))
        return
      }
      const message = error instanceof Error ? error.message : '解析失敗'
      setExtract((current) => ({
        ...current,
        error: { message, code: 'CLIENT' },
      }))
    } finally {
      setBusy(false)
    }
  }, [])

  /** 上傳成功才開始解析。上傳失敗要留在 upload 頁，並把錯誤顯示在選檔區下面。 */
  const startWithFile = useCallback(
    async (file: File, extractParams: ExtractParams) => {
      setParams(extractParams)
      setBusy(true)
      setNotice(null)
      try {
        const uploaded = await uploadDocument(file)
        setFilename(uploaded.filename)
        setDocumentId(uploaded.document_id)
        await runExtract(uploaded.document_id, extractParams)
      } catch (error) {
        setBusy(false)
        setPhase('upload')
        setNotice(error instanceof Error ? error.message : '上傳失敗，請稍後再試。')
      }
    },
    [runExtract],
  )

  const cancelExtract = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const retryExtract = useCallback(() => {
    if (!documentId) return
    void runExtract(documentId, params)
  }, [documentId, params, runExtract])

  const resetToUpload = useCallback(() => {
    abortRef.current?.abort()
    setPhase('upload')
    setFilename('')
    setDocumentId(null)
    setExtract(initialExtractState)
    setFilter('all')
    setActiveGroup('all')
    setNotice(null)
    setBusy(false)
    setSubmitting(false)
    setSubmitError(null)
    setSavedReview(null)
  }, [])

  /** 只改 fields，不動進度、錯誤。所有「改某一欄」都走這裡。 */
  const patchFields = useCallback((updater: (fields: ReviewField[]) => ReviewField[]) => {
    setExtract((current) => ({ ...current, fields: updater(current.fields) }))
  }, [])

  const setFieldValue = useCallback(
    (id: string, value: string) => {
      patchFields((fields) => updateFieldValue(fields, id, value))
    },
    [patchFields],
  )

  const confirmField = useCallback(
    (id: string) => {
      patchFields((fields) => acceptField(fields, id))
    },
    [patchFields],
  )

  const chooseCandidate = useCallback(
    (id: string, value: string) => {
      patchFields((fields) => pickCandidate(fields, id, value))
    },
    [patchFields],
  )

  const revertField = useCallback(
    (id: string) => {
      patchFields((fields) => resetField(fields, id))
    },
    [patchFields],
  )

  /** 寫入 Supabase 成功才進 submitted。失敗留在審核頁，紅條顯示原因。 */
  const submit = useCallback(async () => {
    if (!canSubmit(extract.fields) || submitting) return
    abortRef.current?.abort()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const saved = await saveRequiredReview(filename, documentId, extract.fields)
      setSavedReview(saved)
      setPhase('submitted')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '儲存失敗')
    } finally {
      setSubmitting(false)
    }
  }, [documentId, extract.fields, filename, submitting])

  const grouped = useMemo(() => groupFields(extract.fields), [extract.fields])

  // 左側篩選實際過濾的清單
  const visibleFields = useMemo(() => {
    return extract.fields.filter((field) => {
      if (filter === 'review' && !needsReview(field)) return false
      if (filter === 'required' && !field.required) return false
      if (activeGroup !== 'all' && field.group !== activeGroup) return false
      return true
    })
  }, [extract.fields, filter, activeGroup])

  const reviewCount = extract.fields.filter(needsReview).length
  const missing = missingRequiredLabels(extract.fields)
  const extracting = busy && !extract.done && !extract.error && !extract.cancelled
  // 串流還沒結束時，空的必填可能還沒送到，所以不能送
  const settled = extract.done || extract.cancelled || Boolean(extract.error)
  const ready = settled && canSubmit(extract.fields)

  // 畫面要用的資料跟動作一次回傳，元件不要自己算規則
  return {
    phase,
    filename,
    params,
    extract,
    filter,
    activeGroup,
    busy,
    notice,
    submitting,
    submitError,
    savedReview,
    grouped,
    visibleFields,
    reviewCount,
    missing,
    ready,
    extracting,
    groups: GROUPS,
    startWithFile,
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
    submittedPayload: phase === 'submitted' ? payloadForSubmit(extract.fields) : [],
  }
}

export type ReviewSession = ReturnType<typeof useReviewSession>
