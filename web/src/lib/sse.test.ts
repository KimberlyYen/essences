import { describe, expect, it } from 'vitest'
import { initialExtractState, parseSseBlock, reduceExtract } from './sse'
import { canSubmit } from './fields'

describe('SSE 事件解析', () => {
  it('能解析 stage / field / error / done，event 名稱認錯就會整條鏈壞掉', () => {
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
    expect(parseSseBlock(': keep-alive')).toBeNull()
    expect(parseSseBlock('event: field\ndata: {not-json')).toBeNull()
  })
})

describe('解析過程的狀態累積', () => {
  it('中途收到 error 時，已經抽出的欄位要留下來', () => {
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

    expect(state.fields).toHaveLength(1)
    expect(state.fields[0].label).toBe('品名')
    expect(state.error?.code).toBe('UPSTREAM_TIMEOUT')
    expect(state.done).toBe(false)
    expect(canSubmit(state.fields)).toBe(false)
  })

  it('欄位是一筆一筆累加，不會覆蓋先前結果', () => {
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
})
