/**
 * 紀錄詳情：有 jsonb 快照就用快照；舊資料只攤三個必填。編輯後同步必填欄。
 */
import { describe, expect, it } from 'vitest'
import {
  canSaveSnapshots,
  detailFieldsFromSaved,
  parseFieldSnapshots,
  payloadForUpdate,
  setSnapshotValue,
  snapshotsHaveChanges,
  type SavedReview,
} from './reviews'

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
    expect(
      parseFieldSnapshots([
        {
          id: 'f2',
          label: '有效日期',
          group: '基本資料',
          value: '2026/03/15',
          required: true,
          status: 'pending',
          page: 1,
          candidates: ['2026/03/15', '2026/05/30'],
        },
      ])[0]?.candidates,
    ).toEqual(['2026/03/15', '2026/05/30'])
  })
})

describe('已儲存紀錄的編輯', () => {
  it('改品名時，獨立欄位跟快照一起更新，並標成 edited', () => {
    const original = detailFieldsFromSaved(base)
    const draft = setSnapshotValue(original, 'product_name', '煙燻火腿')
    const payload = payloadForUpdate(original, draft)
    expect(payload.product_name).toBe('煙燻火腿')
    expect(payload.expiry_date).toBe('2027/01/08')
    expect(payload.fields.find((field) => field.id === 'product_name')?.status).toBe('edited')
    expect(payload.fields.find((field) => field.id === 'expiry_date')?.status).toBe('accepted')
  })

  it('必填被清空就不能存；沒改過也不算有變更', () => {
    const original = detailFieldsFromSaved(base)
    expect(canSaveSnapshots(original)).toBe(true)
    expect(snapshotsHaveChanges(original, original)).toBe(false)
    expect(canSaveSnapshots(setSnapshotValue(original, 'product_name', '  '))).toBe(false)
    expect(snapshotsHaveChanges(original, setSnapshotValue(original, 'vendor_name', '別家'))).toBe(true)
  })
})
