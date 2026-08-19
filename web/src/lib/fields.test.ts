/**
 * 送出規則、分組、確認狀態。
 * 有人把 canSubmit 改壞（例如必填空白也能送），這些測試要紅。
 */
import { describe, expect, it } from 'vitest'
import type { ApiField, ReviewField } from '../types'
import {
  acceptField,
  canSubmit,
  groupFields,
  isMissingRequired,
  needsReview,
  pickCandidate,
  requiredReviewRow,
  resetField,
  shouldStartPending,
  toReviewField,
  updateFieldValue,
} from './fields'

/** 測資工廠：只覆寫要測的欄位，其餘用合理預設。 */
function apiField(overrides: Partial<ApiField> = {}): ApiField {
  return {
    id: 'f1',
    label: '品名',
    group: '基本資料',
    value: '經典原味火腿',
    confidence: 0.94,
    required: true,
    page: 1,
    ...overrides,
  }
}

describe('送出條件：法規必填不能空', () => {
  it('必填欄位是空字串時不能送出', () => {
    // 有效日期抽到空字串：這是後端保證會發生的情況
    const fields: ReviewField[] = [
      toReviewField(apiField({ id: 'a', label: '品名', value: '火腿', required: true })),
      toReviewField(apiField({ id: 'b', label: '有效日期', value: '', confidence: null, required: true })),
      toReviewField(
        apiField({
          id: 'c',
          label: '廠商名稱',
          group: '廠商資訊',
          value: '某某食品',
          required: true,
        }),
      ),
    ]

    expect(canSubmit(fields)).toBe(false)
  })

  it('三個必填都有值就可以送出，即使還有低把握未確認', () => {
    // 鈉 confidence 0.4 仍 needsReview，但不該擋住送出
    const fields: ReviewField[] = [
      toReviewField(apiField({ id: 'a', label: '品名', value: '火腿', required: true })),
      toReviewField(
        apiField({ id: 'b', label: '有效日期', value: '2027/01/08', required: true }),
      ),
      toReviewField(
        apiField({
          id: 'c',
          label: '廠商名稱',
          group: '廠商資訊',
          value: '某某食品',
          required: true,
        }),
      ),
      toReviewField(
        apiField({
          id: 'd',
          label: '鈉',
          group: '營養標示',
          value: '820 毫克',
          confidence: 0.4,
          required: false,
        }),
      ),
    ]

    expect(canSubmit(fields)).toBe(true)
    expect(needsReview(fields[3])).toBe(true)
  })

  it('沒有任何欄位時不能送出', () => {
    expect(canSubmit([])).toBe(false)
  })

  it('三個必填標籤還沒全部出現時不能送出——避免解析中途誤送', () => {
    // 只有品名，有效日期跟廠商名稱還沒抽出來
    const fields: ReviewField[] = [
      toReviewField(apiField({ id: 'a', label: '品名', value: '火腿', required: true })),
    ]
    expect(canSubmit(fields)).toBe(false)
  })

  it('必填只填空白字元仍視為缺漏', () => {
    const field = toReviewField(apiField({ value: '   ', required: true, confidence: null }))
    expect(isMissingRequired(field)).toBe(true)
    expect(canSubmit([field])).toBe(false)
  })
})

describe('抽出欄位的初始狀態', () => {
  it('高把握、沒有候選的欄位預設已接受，不必逐筆確認', () => {
    expect(shouldStartPending(apiField({ confidence: 0.94, required: false }))).toBe(false)
    expect(toReviewField(apiField({ confidence: 0.94 })).status).toBe('accepted')
  })

  it('低把握、缺漏、多候選都要進待確認', () => {
    expect(shouldStartPending(apiField({ confidence: 0.51 }))).toBe(true)
    expect(shouldStartPending(apiField({ value: '', confidence: null, required: true }))).toBe(
      true,
    )
    expect(
      shouldStartPending(
        apiField({ candidates: ['2026/03/15', '2026/05/30'], confidence: 0.49 }),
      ),
    ).toBe(true)
  })
})

describe('群組：後端回傳順序可以交錯，畫面上同組要排在一起', () => {
  it('交錯到達的欄位會依群組歸位，且組內維持到達順序', () => {
    // 到達順序：基本、營養、基本、廠商、營養 → 組內應是 1,3 與 2,5
    const fields = [
      toReviewField(apiField({ id: '1', label: '品名', group: '基本資料' })),
      toReviewField(apiField({ id: '2', label: '熱量', group: '營養標示', required: false })),
      toReviewField(apiField({ id: '3', label: '有效日期', group: '基本資料' })),
      toReviewField(
        apiField({ id: '4', label: '廠商名稱', group: '廠商資訊', required: true }),
      ),
      toReviewField(apiField({ id: '5', label: '鈉', group: '營養標示', required: false })),
    ]

    const grouped = groupFields(fields)
    expect(grouped.get('基本資料')?.map((field) => field.id)).toEqual(['1', '3'])
    expect(grouped.get('營養標示')?.map((field) => field.id)).toEqual(['2', '5'])
    expect(grouped.get('廠商資訊')?.map((field) => field.id)).toEqual(['4'])
    expect(grouped.get('檢驗結果')).toEqual([])
  })
})

describe('修改與確認', () => {
  it('把缺漏的必填補上之後就可以送出', () => {
    const start = [
      toReviewField(apiField({ id: 'a', label: '品名', value: '火腿', required: true })),
      toReviewField(
        apiField({ id: 'b', label: '有效日期', value: '', confidence: null, required: true }),
      ),
      toReviewField(
        apiField({
          id: 'c',
          label: '廠商名稱',
          group: '廠商資訊',
          value: '某某食品',
          required: true,
        }),
      ),
    ]
    expect(canSubmit(start)).toBe(false)

    const filled = updateFieldValue(start, 'b', '2027/01/08')
    expect(canSubmit(filled)).toBe(true)
    expect(filled[1].status).toBe('edited')
  })

  it('把已填的必填清掉會再次擋送出', () => {
    // 使用者把有效日期刪光，status 要回到 pending
    const start = [
      toReviewField(apiField({ id: 'a', label: '品名', value: '火腿', required: true })),
      toReviewField(
        apiField({ id: 'b', label: '有效日期', value: '2027/01/08', required: true }),
      ),
      toReviewField(
        apiField({
          id: 'c',
          label: '廠商名稱',
          group: '廠商資訊',
          value: '某某食品',
          required: true,
        }),
      ),
    ]
    const cleared = updateFieldValue(start, 'b', '')
    expect(canSubmit(cleared)).toBe(false)
    expect(cleared[1].status).toBe('pending')
  })

  it('空的必填不能被標成已確認', () => {
    // 防呆：確認鈕在 UI 上也不該出現，但函式本身也要擋
    const start = [toReviewField(apiField({ value: '', confidence: null, required: true }))]
    expect(acceptField(start, 'f1')[0].status).toBe('pending')
  })

  it('選候選值會接受該欄，選到非首選會標成已修改', () => {
    // 第一個候選是系統首選；選第二個代表使用者改過
    const start = [
      toReviewField(
        apiField({
          value: '2026/03/15',
          candidates: ['2026/03/15', '2026/05/30'],
          confidence: 0.49,
        }),
      ),
    ]
    expect(start[0].status).toBe('pending')
    expect(pickCandidate(start, 'f1', '2026/03/15')[0].status).toBe('accepted')
    expect(pickCandidate(start, 'f1', '2026/05/30')[0].status).toBe('edited')
  })

  it('重設會回到系統抽出的值與待確認狀態', () => {
    // originalValue 是空字串時，還原後還是缺漏
    const start = [
      toReviewField(apiField({ value: '', confidence: null, required: true })),
    ]
    const filled = updateFieldValue(start, 'f1', '我填的')
    const reset = resetField(filled, 'f1')
    expect(reset[0].value).toBe('')
    expect(reset[0].status).toBe('pending')
  })

  it('送出前會抽出三個法規必填的值', () => {
    // 對應 Supabase 欄位 product_name / expiry_date / vendor_name
    const fields = [
      toReviewField(apiField({ id: 'a', label: '品名', value: '經典原味火腿', required: true })),
      toReviewField(
        apiField({ id: 'b', label: '有效日期', value: '2027/01/08', required: true }),
      ),
      toReviewField(
        apiField({
          id: 'c',
          label: '廠商名稱',
          group: '廠商資訊',
          value: '某某食品股份有限公司',
          required: true,
        }),
      ),
    ]
    expect(requiredReviewRow('檢驗報告.pdf', 'doc-1', fields)).toEqual({
      filename: '檢驗報告.pdf',
      document_id: 'doc-1',
      product_name: '經典原味火腿',
      expiry_date: '2027/01/08',
      vendor_name: '某某食品股份有限公司',
    })
  })
})
