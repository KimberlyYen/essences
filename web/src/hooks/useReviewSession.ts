import { useCallback, useMemo, useRef, useState } from 'react'
import { streamExtract, uploadDocument } from '../lib/api'
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
} from '../lib/fields'
import { initialExtractState, reduceExtract } from '../lib/sse'
import type { ExtractParams, ExtractState, FilterId, Group, ReviewField } from '../types'
import { GROUPS } from '../types'

export type Phase = 'upload' | 'working' | 'submitted'

export const defaultParams: ExtractParams = {
  field_count: 18,
  speed: 1,
  fail_at: -1,
}

export function useReviewSession() {
  const [phase, setPhase] = useState<Phase>('upload')
  const [filename, setFilename] = useState('')
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [params, setParams] = useState<ExtractParams>(defaultParams)
  const [extract, setExtract] = useState<ExtractState>(initialExtractState)
  const [filter, setFilter] = useState<FilterId>('all')
  const [activeGroup, setActiveGroup] = useState<Group | 'all'>('all')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

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
        setNotice(error instanceof Error ? error.message : '上傳失敗')
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
  }, [])

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

  const submit = useCallback(() => {
    if (!canSubmit(extract.fields)) return
    abortRef.current?.abort()
    setPhase('submitted')
  }, [extract.fields])

  const grouped = useMemo(() => groupFields(extract.fields), [extract.fields])

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
  const settled = extract.done || extract.cancelled || Boolean(extract.error)
  const ready = settled && canSubmit(extract.fields)

  return {
    phase,
    filename,
    params,
    extract,
    filter,
    activeGroup,
    busy,
    notice,
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
