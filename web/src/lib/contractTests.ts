/**
 * 契約測試：網頁「執行測試」跟 `npm test` 跑同一批。
 * 失敗會 throw，TestReportScreen 據此標紅。
 */
import type { ApiField, ReviewField } from '../types'
import { assert, assertEqual } from './assert'
import { candidatesForField } from './candidates'
import {
  acceptField,
  canSubmit,
  ensureRequiredFields,
  fromDateInputValue,
  groupFields,
  isDateFieldLabel,
  isMissingRequired,
  needsReview,
  payloadForSubmit,
  pickCandidate,
  requiredReviewRow,
  resetField,
  shouldCollapseGroups,
  shouldStartPending,
  toDateInputValue,
  toReviewField,
  updateFieldValue,
} from './fields'
import {
  canSaveSnapshots,
  detailFieldsFromSaved,
  parseFieldSnapshots,
  payloadForUpdate,
  setSnapshotValue,
  snapshotsHaveChanges,
  type SavedReview,
} from './reviews'
import { flushSseBuffer, initialExtractState, parseSseBlock, reduceExtract } from './sse'

export type ContractTest = {
  file: 'fields' | 'sse' | 'reviews' | 'candidates'
  group: string
  name: string
  run: () => void
}

export type ContractTestResult = {
  file: ContractTest['file']
  group: string
  name: string
  ok: boolean
  error?: string
}

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

const savedBase: SavedReview = {
  id: '1',
  filename: 'a.pdf',
  document_id: 'doc',
  product_name: '火腿',
  expiry_date: '2027/01/08',
  vendor_name: '某某食品',
  created_at: '2026-08-19T00:00:00Z',
  fields: [],
}

export const CONTRACT_TESTS: ContractTest[] = [
  {
    file: 'fields',
    group: '送出條件：法規必填不能空',
    name: '必填欄位是空字串時不能送出',
    run() {
      const fields: ReviewField[] = [
        toReviewField(apiField({ id: 'a', label: '品名', value: '火腿', required: true })),
        toReviewField(apiField({ id: 'b', label: '有效日期', value: '', confidence: null, required: true })),
        toReviewField(apiField({ id: 'c', label: '廠商名稱', group: '廠商資訊', value: '某某食品', required: true })),
      ]
      assertEqual(canSubmit(fields), false)
    },
  },
  {
    file: 'fields',
    group: '送出條件：法規必填不能空',
    name: '三個必填都有值就可以送出，即使還有低把握未確認',
    run() {
      const fields: ReviewField[] = [
        toReviewField(apiField({ id: 'a', label: '品名', value: '火腿', required: true })),
        toReviewField(apiField({ id: 'b', label: '有效日期', value: '2027/01/08', required: true })),
        toReviewField(apiField({ id: 'c', label: '廠商名稱', group: '廠商資訊', value: '某某食品', required: true })),
        toReviewField(apiField({ id: 'd', label: '鈉', group: '營養標示', value: '820 毫克', confidence: 0.4, required: false })),
      ]
      assertEqual(canSubmit(fields), true)
      assertEqual(needsReview(fields[3]), true)
    },
  },
  {
    file: 'fields',
    group: '送出條件：法規必填不能空',
    name: '沒有任何欄位時不能送出',
    run() {
      assertEqual(canSubmit([]), false)
    },
  },
  {
    file: 'fields',
    group: '送出條件：法規必填不能空',
    name: '三個必填標籤還沒全部出現時不能送出——避免解析中途誤送',
    run() {
      const fields: ReviewField[] = [toReviewField(apiField({ id: 'a', label: '品名', value: '火腿', required: true }))]
      assertEqual(canSubmit(fields), false)
    },
  },
  {
    file: 'fields',
    group: '送出條件：法規必填不能空',
    name: '串流停了之後，缺席的必填要補成空白列',
    run() {
      const partial: ReviewField[] = [
        toReviewField(apiField({ id: 'd', label: '鈉', group: '營養標示', value: '890 毫克', required: false })),
      ]
      const padded = ensureRequiredFields(partial)
      assertEqual(padded.map((field) => field.label), ['鈉', '品名', '有效日期', '廠商名稱'])
      assertEqual(padded[0].value, '890 毫克')
      assertEqual(canSubmit(padded), false)
      const filled = ['品名', '有效日期', '廠商名稱'].reduce(
        (fields, label, index) =>
          updateFieldValue(fields, `missing-${label}`, ['黑胡椒香腸', '2027/04/10', '好味食品'][index]),
        padded,
      )
      assertEqual(canSubmit(filled), true)
      assertEqual(ensureRequiredFields(padded), padded)
    },
  },
  {
    file: 'fields',
    group: '送出條件：法規必填不能空',
    name: '必填只填空白字元仍視為缺漏',
    run() {
      const field = toReviewField(apiField({ value: '   ', required: true, confidence: null }))
      assertEqual(isMissingRequired(field), true)
      assertEqual(canSubmit([field]), false)
    },
  },
  {
    file: 'fields',
    group: '抽出欄位的初始狀態',
    name: '高把握、沒有候選的欄位預設已接受，不必逐筆確認',
    run() {
      assertEqual(shouldStartPending(apiField({ confidence: 0.94, required: false })), false)
      assertEqual(toReviewField(apiField({ confidence: 0.94 })).status, 'accepted')
    },
  },
  {
    file: 'fields',
    group: '抽出欄位的初始狀態',
    name: '低把握、缺漏、多候選都要進待確認',
    run() {
      assertEqual(shouldStartPending(apiField({ confidence: 0.51 })), true)
      assertEqual(shouldStartPending(apiField({ value: '', confidence: null, required: true })), true)
      assertEqual(
        shouldStartPending(apiField({ candidates: ['2026/03/15', '2026/05/30'], confidence: 0.49 })),
        true,
      )
    },
  },
  {
    file: 'fields',
    group: '群組：後端回傳順序可以交錯，畫面上同組要排在一起',
    name: '交錯到達的欄位會依群組歸位，且組內維持到達順序',
    run() {
      const fields = [
        toReviewField(apiField({ id: '1', label: '品名', group: '基本資料' })),
        toReviewField(apiField({ id: '2', label: '熱量', group: '營養標示', required: false })),
        toReviewField(apiField({ id: '3', label: '有效日期', group: '基本資料' })),
        toReviewField(apiField({ id: '4', label: '廠商名稱', group: '廠商資訊', required: true })),
        toReviewField(apiField({ id: '5', label: '鈉', group: '營養標示', required: false })),
      ]
      const grouped = groupFields(fields)
      assertEqual(grouped.get('基本資料')?.map((field) => field.id), ['1', '3'])
      assertEqual(grouped.get('營養標示')?.map((field) => field.id), ['2', '5'])
      assertEqual(grouped.get('廠商資訊')?.map((field) => field.id), ['4'])
      assertEqual(grouped.get('檢驗結果'), [])
    },
  },
  {
    file: 'fields',
    group: '群組：後端回傳順序可以交錯，畫面上同組要排在一起',
    name: '看全部又沒鎖群組時才收合，避免上百欄變成無限捲軸',
    run() {
      assertEqual(shouldCollapseGroups('all', 'all'), true)
      assertEqual(shouldCollapseGroups('review', 'all'), false)
      assertEqual(shouldCollapseGroups('all', '基本資料'), false)
    },
  },
  {
    file: 'fields',
    group: '修改與確認',
    name: '把缺漏的必填補上之後就可以送出',
    run() {
      const start = [
        toReviewField(apiField({ id: 'a', label: '品名', value: '火腿', required: true })),
        toReviewField(apiField({ id: 'b', label: '有效日期', value: '', confidence: null, required: true })),
        toReviewField(apiField({ id: 'c', label: '廠商名稱', group: '廠商資訊', value: '某某食品', required: true })),
      ]
      assertEqual(canSubmit(start), false)
      const filled = updateFieldValue(start, 'b', '2027/01/08')
      assertEqual(canSubmit(filled), true)
      assertEqual(filled[1].status, 'edited')
      assertEqual(needsReview(filled[1]), true)
    },
  },
  {
    file: 'fields',
    group: '修改與確認',
    name: '缺漏必填打第一個字仍留在需檢查，輸入框才不會被篩掉卸載',
    run() {
      const empty = toReviewField(
        apiField({ id: 'c', label: '廠商名稱', group: '廠商資訊', value: '', confidence: null, required: true }),
      )
      assertEqual(needsReview(empty), true)
      const typed = updateFieldValue([empty], 'c', '好')[0]
      assertEqual(typed.value, '好')
      assertEqual(needsReview(typed), true)
    },
  },
  {
    file: 'fields',
    group: '修改與確認',
    name: '把已填的必填清掉會再次擋送出',
    run() {
      const start = [
        toReviewField(apiField({ id: 'a', label: '品名', value: '火腿', required: true })),
        toReviewField(apiField({ id: 'b', label: '有效日期', value: '2027/01/08', required: true })),
        toReviewField(apiField({ id: 'c', label: '廠商名稱', group: '廠商資訊', value: '某某食品', required: true })),
      ]
      const cleared = updateFieldValue(start, 'b', '')
      assertEqual(canSubmit(cleared), false)
      assertEqual(cleared[1].status, 'pending')
    },
  },
  {
    file: 'fields',
    group: '修改與確認',
    name: '空的必填不能被標成已確認',
    run() {
      const start = [toReviewField(apiField({ value: '', confidence: null, required: true }))]
      assertEqual(acceptField(start, 'f1')[0].status, 'pending')
    },
  },
  {
    file: 'fields',
    group: '修改與確認',
    name: '選候選值會接受該欄，選到非首選會標成已修改',
    run() {
      const start = [
        toReviewField(apiField({ value: '2026/03/15', candidates: ['2026/03/15', '2026/05/30'], confidence: 0.49 })),
      ]
      assertEqual(start[0].status, 'pending')
      assertEqual(pickCandidate(start, 'f1', '2026/03/15')[0].status, 'accepted')
      assertEqual(pickCandidate(start, 'f1', '2026/05/30')[0].status, 'edited')
    },
  },
  {
    file: 'fields',
    group: '修改與確認',
    name: '重設會回到系統抽出的值與待確認狀態',
    run() {
      const start = [toReviewField(apiField({ value: '', confidence: null, required: true }))]
      const filled = updateFieldValue(start, 'f1', '我填的')
      const reset = resetField(filled, 'f1')
      assertEqual(reset[0].value, '')
      assertEqual(reset[0].status, 'pending')
    },
  },
  {
    file: 'fields',
    group: '修改與確認',
    name: '送出前會抽出三個法規必填的值',
    run() {
      const fields = [
        toReviewField(apiField({ id: 'a', label: '品名', value: '經典原味火腿', required: true })),
        toReviewField(apiField({ id: 'b', label: '有效日期', value: '2027/01/08', required: true })),
        toReviewField(
          apiField({ id: 'c', label: '廠商名稱', group: '廠商資訊', value: '某某食品股份有限公司', required: true }),
        ),
      ]
      assertEqual(requiredReviewRow('檢驗報告.pdf', 'doc-1', fields), {
        filename: '檢驗報告.pdf',
        document_id: 'doc-1',
        product_name: '經典原味火腿',
        expiry_date: '2027/01/08',
        vendor_name: '某某食品股份有限公司',
      })
    },
  },
  {
    file: 'fields',
    group: '日期選單與儲存格式',
    name: '有效日期、製造日期用日期選單；保存期限仍是文字',
    run() {
      assertEqual(isDateFieldLabel('有效日期'), true)
      assertEqual(isDateFieldLabel('有效日期（2）'), true)
      assertEqual(isDateFieldLabel('製造日期'), true)
      assertEqual(isDateFieldLabel('保存期限'), false)
      assertEqual(isDateFieldLabel('品名'), false)
    },
  },
  {
    file: 'fields',
    group: '日期選單與儲存格式',
    name: 'date input 的 ISO 值要轉回 mock 用的 2027/01/08',
    run() {
      assertEqual(toDateInputValue('2027/01/08'), '2027-01-08')
      assertEqual(fromDateInputValue('2027-01-08'), '2027/01/08')
      assertEqual(toDateInputValue(''), '')
      assertEqual(fromDateInputValue(''), '')
    },
  },
  {
    file: 'fields',
    group: '送出快照',
    name: '多候選欄位要把候選一併寫進快照，詳情才能再挑',
    run() {
      const snapshot = payloadForSubmit([
        toReviewField(apiField({ id: 'b', label: '有效日期', candidates: ['2026/03/15', '2026/05/30'] })),
      ])[0]
      assertEqual(snapshot.candidates, ['2026/03/15', '2026/05/30'])
    },
  },
  {
    file: 'sse',
    group: 'SSE 事件解析',
    name: '能解析 stage / field / error / done，event 名稱認錯就會整條鏈壞掉',
    run() {
      assertEqual(parseSseBlock('event: stage\ndata: {"stage":"抽取欄位","progress":75,"total":18}'), {
        type: 'stage',
        stage: '抽取欄位',
        progress: 75,
        total: 18,
      })
      assertEqual(
        parseSseBlock(
          'event: field\ndata: {"id":"f7","label":"有效日期","group":"基本資料","value":"","confidence":null,"required":true,"page":1}',
        ),
        {
          type: 'field',
          field: {
            id: 'f7',
            label: '有效日期',
            group: '基本資料',
            value: '',
            confidence: null,
            required: true,
            page: 1,
            candidates: undefined,
          },
        },
      )
      assertEqual(parseSseBlock('event: error\ndata: {"message":"解析服務暫時無法回應","code":"UPSTREAM_TIMEOUT"}'), {
        type: 'error',
        message: '解析服務暫時無法回應',
        code: 'UPSTREAM_TIMEOUT',
      })
      assertEqual(parseSseBlock('event: done\ndata: {"stage":"完成","progress":100,"field_count":18}'), {
        type: 'done',
        stage: '完成',
        progress: 100,
        field_count: 18,
      })
    },
  },
  {
    file: 'sse',
    group: 'SSE 事件解析',
    name: '註解行與壞掉的 JSON 不會炸掉後續欄位',
    run() {
      assertEqual(parseSseBlock(': keep-alive'), null)
      assertEqual(parseSseBlock('event: field\ndata: {not-json'), null)
    },
  },
  {
    file: 'sse',
    group: 'SSE 事件解析',
    name: '不認識的 event 名稱回 null，不要 throw',
    run() {
      assertEqual(parseSseBlock('event: ping\ndata: {}'), null)
    },
  },
  {
    file: 'sse',
    group: '串流半截 chunk',
    name: 'JSON 被切成兩塊時，第一輪不吐事件，拼完才 parse',
    run() {
      const first = flushSseBuffer('event: field\ndata: {"id":"f1","label":"品名"')
      assertEqual(first.events, [])
      assert(first.rest.includes('品名'), '半截 buffer 要留下品名')
      const second = flushSseBuffer(
        `${first.rest},"group":"基本資料","value":"火腿","confidence":0.9,"required":true,"page":1}\n\n`,
      )
      assertEqual(second.events.length, 1)
      assertEqual(second.events[0]?.type, 'field')
      if (second.events[0]?.type === 'field') {
        assertEqual(second.events[0].field.id, 'f1')
        assertEqual(second.events[0].field.label, '品名')
      }
      assertEqual(second.rest, '')
    },
  },
  {
    file: 'sse',
    group: '串流半截 chunk',
    name: '同一塊裡兩個完整事件會一次吐出',
    run() {
      const block =
        'event: stage\ndata: {"stage":"抽取欄位","progress":75}\n\n' +
        'event: done\ndata: {"stage":"完成","progress":100,"field_count":1}\n\n'
      const { events, rest } = flushSseBuffer(block)
      assertEqual(events.map((event) => event.type), ['stage', 'done'])
      assertEqual(rest, '')
    },
  },
  {
    file: 'sse',
    group: '解析過程的狀態累積',
    name: '中途收到 error 時，已經抽出的欄位要留下來',
    run() {
      let state = initialExtractState
      state = reduceExtract(state, {
        type: 'field',
        field: {
          id: 'f1',
          label: '品名',
          group: '基本資料',
          value: '火腿',
          confidence: 0.9,
          required: true,
          page: 1,
        },
      })
      state = reduceExtract(state, {
        type: 'error',
        message: '解析服務暫時無法回應',
        code: 'UPSTREAM_TIMEOUT',
      })
      assertEqual(state.fields.map((field) => field.label), ['品名', '有效日期', '廠商名稱'])
      assertEqual(state.fields[0].value, '火腿')
      assertEqual(state.fields[1].value, '')
      assertEqual(state.error?.code, 'UPSTREAM_TIMEOUT')
      assertEqual(state.done, false)
      assertEqual(canSubmit(state.fields), false)
    },
  },
  {
    file: 'sse',
    group: '解析過程的狀態累積',
    name: '欄位是一筆一筆累加，不會覆蓋先前結果',
    run() {
      let state = initialExtractState
      state = reduceExtract(state, {
        type: 'field',
        field: {
          id: 'f1',
          label: '品名',
          group: '基本資料',
          value: '火腿',
          confidence: 0.9,
          required: true,
          page: 1,
        },
      })
      state = reduceExtract(state, {
        type: 'field',
        field: {
          id: 'f2',
          label: '鈉',
          group: '營養標示',
          value: '820 毫克',
          confidence: 0.4,
          required: false,
          page: 1,
        },
      })
      assertEqual(state.fields.map((field) => field.id), ['f1', 'f2'])
    },
  },
  {
    file: 'sse',
    group: '解析過程的狀態累積',
    name: '收到 done 之後 done 為 true',
    run() {
      const state = reduceExtract(initialExtractState, {
        type: 'done',
        stage: '完成',
        progress: 100,
        field_count: 0,
      })
      assertEqual(state.done, true)
      assertEqual(state.stage, '完成')
    },
  },
  {
    file: 'reviews',
    group: '已儲存紀錄的詳細欄位',
    name: '沒有 fields 快照時，至少把三個法規必填攤出來',
    run() {
      const detail = detailFieldsFromSaved(savedBase)
      assertEqual(detail.map((field) => field.label), ['品名', '有效日期', '廠商名稱'])
      assertEqual(detail[0].value, '火腿')
    },
  },
  {
    file: 'reviews',
    group: '已儲存紀錄的詳細欄位',
    name: '有快照時用快照，不要只剩三個必填',
    run() {
      const detail = detailFieldsFromSaved({
        ...savedBase,
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
      assertEqual(detail.length, 1)
      assertEqual(detail[0].label, '鈉')
    },
  },
  {
    file: 'reviews',
    group: '已儲存紀錄的詳細欄位',
    name: '壞掉的 jsonb 列要跳過，不要讓列表炸掉',
    run() {
      assertEqual(parseFieldSnapshots(null), [])
      assertEqual(
        parseFieldSnapshots([{ label: '鈉', id: 'f1', group: '營養標示', value: '1', required: false, status: 'accepted', page: 1 }]).length,
        1,
      )
      assertEqual(parseFieldSnapshots(['nope']), [])
      assertEqual(
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
        ['2026/03/15', '2026/05/30'],
      )
    },
  },
  {
    file: 'reviews',
    group: '已儲存紀錄的編輯',
    name: '改品名時，獨立欄位跟快照一起更新，並標成 edited',
    run() {
      const original = detailFieldsFromSaved(savedBase)
      const draft = setSnapshotValue(original, 'product_name', '煙燻火腿')
      const payload = payloadForUpdate(original, draft)
      assertEqual(payload.product_name, '煙燻火腿')
      assertEqual(payload.expiry_date, '2027/01/08')
      assertEqual(payload.fields.find((field) => field.id === 'product_name')?.status, 'edited')
      assertEqual(payload.fields.find((field) => field.id === 'expiry_date')?.status, 'accepted')
    },
  },
  {
    file: 'reviews',
    group: '已儲存紀錄的編輯',
    name: '必填被清空就不能存；沒改過也不算有變更',
    run() {
      const original = detailFieldsFromSaved(savedBase)
      assertEqual(canSaveSnapshots(original), true)
      assertEqual(snapshotsHaveChanges(original, original), false)
      assertEqual(canSaveSnapshots(setSnapshotValue(original, 'product_name', '  ')), false)
      assertEqual(snapshotsHaveChanges(original, setSnapshotValue(original, 'vendor_name', '別家')), true)
    },
  },
  {
    file: 'candidates',
    group: '詳情頁候選值',
    name: '快照已有候選就用快照，並把目前值放進去',
    run() {
      assertEqual(
        candidatesForField({
          label: '有效日期',
          value: '2026/11/30',
          candidates: ['2026/03/15', '2026/05/30'],
        }),
        ['2026/11/30', '2026/03/15', '2026/05/30'],
      )
    },
  },
  {
    file: 'candidates',
    group: '詳情頁候選值',
    name: '舊紀錄沒存候選時，用 mock 同一標籤的可能值補上',
    run() {
      const options = candidatesForField({ label: '產品編號', value: 'TH-2041' })
      assert(options.includes('TH-2041'), '要包含目前值')
      assert(options.includes('TH-3387'), '要包含 mock 池裡的其他值')
      assert(options.length >= 2, '至少兩個候選')
    },
  },
  {
    file: 'candidates',
    group: '詳情頁候選值',
    name: '有效日期（2）也對到有效日期的可能值',
    run() {
      const options = candidatesForField({ label: '有效日期（2）', value: '2027/01/08' })
      assert(options.includes('2026/11/30'), '要對到有效日期池')
    },
  },
]

export function runOneContractTest(test: ContractTest): ContractTestResult {
  try {
    test.run()
    return { file: test.file, group: test.group, name: test.name, ok: true }
  } catch (caught) {
    return {
      file: test.file,
      group: test.group,
      name: test.name,
      ok: false,
      error: caught instanceof Error ? caught.message : String(caught),
    }
  }
}

export function runContractTests(): {
  passed: number
  failed: number
  results: ContractTestResult[]
} {
  const results = CONTRACT_TESTS.map(runOneContractTest)
  return {
    passed: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  }
}

export function testsForFile(file: ContractTest['file']): ContractTest[] {
  return CONTRACT_TESTS.filter((test) => test.file === file)
}
