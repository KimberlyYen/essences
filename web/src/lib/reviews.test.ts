/**
 * 紀錄詳情：有 jsonb 快照就用快照；舊資料只攤三個必填。
 */
import { describe, expect, it } from 'vitest'
import { detailFieldsFromSaved, parseFieldSnapshots, type SavedReview } from './reviews'

const base: SavedReview = {
  id: '1',
  filename: 'a.pdf',
  document_id: 'doc',
  product_name: '火腿',
  expiry_date: '2027/01/08',
  vendor_name: '某某食品',
  created_at: '2026-08-19T00:00:00Z',
  fields: [],
}

describe('已儲存紀錄的詳細欄位', () => {
  it('沒有 fields 快照時，至少把三個法規必填攤出來', () => {
    const detail = detailFieldsFromSaved(base)
    expect(detail.map((field) => field.label)).toEqual(['品名', '有效日期', '廠商名稱'])
    expect(detail[0].value).toBe('火腿')
  })

  it('有快照時用快照，不要只剩三個必填', () => {
    const detail = detailFieldsFromSaved({
      ...base,
      fields: [
        {
          id: 'f1',
          label: '鈉',
          group: '營養標示',
          value: '820 毫克',
          required: false,
          status: 'accepted',
          page: 1,
        },
      ],
    })
    expect(detail).toHaveLength(1)
    expect(detail[0].label).toBe('鈉')
  })

  it('壞掉的 jsonb 列要跳過，不要讓列表炸掉', () => {
    expect(parseFieldSnapshots(null)).toEqual([])
    expect(parseFieldSnapshots([{ label: '鈉', id: 'f1', group: '營養標示', value: '1', required: false, status: 'accepted', page: 1 }])).toHaveLength(1)
    expect(parseFieldSnapshots(['nope'])).toEqual([])
  })
})
