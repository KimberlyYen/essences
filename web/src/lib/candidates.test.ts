import { describe, expect, it } from 'vitest'
import { candidatesForField } from './candidates'

describe('詳情頁候選值', () => {
  it('快照已有候選就用快照，並把目前值放進去', () => {
    expect(
      candidatesForField({
        label: '有效日期',
        value: '2026/11/30',
        candidates: ['2026/03/15', '2026/05/30'],
      }),
    ).toEqual(['2026/11/30', '2026/03/15', '2026/05/30'])
  })

  it('舊紀錄沒存候選時，用 mock 同一標籤的可能值補上', () => {
    const options = candidatesForField({
      label: '產品編號',
      value: 'TH-2041',
    })
    expect(options).toContain('TH-2041')
    expect(options).toContain('TH-3387')
    expect(options.length).toBeGreaterThanOrEqual(2)
  })

  it('有效日期（2）也對到有效日期的可能值', () => {
    const options = candidatesForField({ label: '有效日期（2）', value: '2027/01/08' })
    expect(options).toContain('2026/11/30')
  })
})
