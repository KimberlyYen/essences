/**
 * 紀錄詳情：有 jsonb 快照就用快照；舊資料只攤三個必填。
 * 本體在 contractTests.ts，網頁「執行測試」跑同一批。
 */
import { describe, it } from 'vitest'
import { testsForFile } from './contractTests'

const tests = testsForFile('reviews')
const groups = [...new Set(tests.map((test) => test.group))]

for (const group of groups) {
  describe(group, () => {
    for (const test of tests.filter((item) => item.group === group)) {
      it(test.name, test.run)
    }
  })
}
