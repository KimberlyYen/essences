/**
 * SSE 事件名認錯、error 把已抽出欄位清掉，這支會紅。
 */
import { describe, expect, it } from 'vitest'
import { initialExtractState, flushSseBuffer, parseSseBlock, reduceExtract } from './sse'
import { canSubmit } from './fields'

describe('SSE 事件解析', () => {
  it('能解析 stage / field / error / done，event 名稱認錯就會整條鏈壞掉', () => {
    // 四種 event 名稱都要對得上 mock 後端 README
    expect(
      parseSseBlock('event: stage\ndata: {"stage":"抽取欄位","progress":75,"total":18}'),
    ).toEqual({
      type: 'stage',
      stage: '抽取欄位',
      progress: 75,
      total: 18,
    })

    expect(
      parseSseBlock(
        'event: field\ndata: {"id":"f7","label":"有效日期","group":"基本資料","value":"","confidence":null,"required":true,"page":1}',
      ),
    ).toEqual({
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
    })

    expect(
      parseSseBlock(
        'event: error\ndata: {"message":"解析服務暫時無法回應","code":"UPSTREAM_TIMEOUT"}',
      ),
    ).toEqual({
      type: 'error',
      message: '解析服務暫時無法回應',
      code: 'UPSTREAM_TIMEOUT',
    })

    expect(
      parseSseBlock('event: done\ndata: {"stage":"完成","progress":100,"field_count":18}'),
    ).toEqual({
      type: 'done',
      stage: '完成',
      progress: 100,
      field_count: 18,
    })
  })

  it('註解行與壞掉的 JSON 不會炸掉後續欄位', () => {
    // parse 失敗要回 null，呼叫端直接跳過，不要 throw
    expect(parseSseBlock(': keep-alive')).toBeNull()
    expect(parseSseBlock('event: field\ndata: {not-json')).toBeNull()
  })

  it('不認識的 event 名稱回 null，不要 throw', () => {
    expect(parseSseBlock('event: ping\ndata: {}')).toBeNull()
  })
})

describe('串流半截 chunk', () => {
  it('JSON 被切成兩塊時，第一輪不吐事件，拼完才 parse', () => {
    // 模擬 nginx / fetch 把 data: 中間切開
    const first = flushSseBuffer('event: field\ndata: {"id":"f1","label":"品名"')
    expect(first.events).toEqual([])
    expect(first.rest).toContain('品名')

    const second = flushSseBuffer(
      `${first.rest},"group":"基本資料","value":"火腿","confidence":0.9,"required":true,"page":1}\n\n`,
    )
    expect(second.events).toHaveLength(1)
    expect(second.events[0]).toMatchObject({ type: 'field' })
    if (second.events[0].type === 'field') {
      expect(second.events[0].field.id).toBe('f1')
      expect(second.events[0].field.label).toBe('品名')
    }
    expect(second.rest).toBe('')
  })

  it('同一塊裡兩個完整事件會一次吐出', () => {
    const block =
      'event: stage\ndata: {"stage":"抽取欄位","progress":75}\n\n' +
      'event: done\ndata: {"stage":"完成","progress":100,"field_count":1}\n\n'
    const { events, rest } = flushSseBuffer(block)
    expect(events.map((event) => event.type)).toEqual(['stage', 'done'])
    expect(rest).toBe('')
  })
})

describe('解析過程的狀態累積', () => {
  it('中途收到 error 時，已經抽出的欄位要留下來', () => {
    // 先累積一筆 field，再 error；fields 長度仍要是 1
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

    expect(state.fields.map((field) => field.label)).toEqual(['品名', '有效日期', '廠商名稱'])
    expect(state.fields[0].value).toBe('火腿')
    expect(state.fields[1].value).toBe('')
    expect(state.error?.code).toBe('UPSTREAM_TIMEOUT')
    expect(state.done).toBe(false)
    expect(canSubmit(state.fields)).toBe(false)
  })

  it('欄位是一筆一筆累加，不會覆蓋先前結果', () => {
    // 兩次 field 之後 ids 應是 f1, f2，不是只剩 f2
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

    expect(state.fields.map((field) => field.id)).toEqual(['f1', 'f2'])
  })

  it('收到 done 之後 done 為 true', () => {
    const state = reduceExtract(initialExtractState, {
      type: 'done',
      stage: '完成',
      progress: 100,
      field_count: 0,
    })
    expect(state.done).toBe(true)
    expect(state.stage).toBe('完成')
  })
})
