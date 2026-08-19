/**
 * 測試報告的文案資料。
 * 題目說數量不重要，看的是「哪天有人改壞了，這支會不會紅」。
 * 這裡對應 web/src/lib 裡那 18 支測試，畫面只負責呈現，不在瀏覽器裡重跑 vitest。
 */

export type TestCaseReport = {
  id: string
  name: string
  /** 這支鎖住的規則 */
  guards: string
  /** 什麼樣的改動會讓它變紅 */
  breaksIf: string
}

export type TestGroupReport = {
  id: string
  title: string
  file: string
  cases: TestCaseReport[]
}

export const TEST_GROUPS: TestGroupReport[] = [
  {
    id: 'submit',
    title: '送出條件：法規必填不能空',
    file: 'web/src/lib/fields.test.ts',
    cases: [
      {
        id: 'empty-required',
        name: '必填欄位是空字串時不能送出',
        guards: '有效日期抽到空字串時，送出必須被擋住。',
        breaksIf: '有人改 canSubmit，讓空的必填也能過。',
      },
      {
        id: 'low-confidence-ok',
        name: '三個必填都有值就可以送出，即使還有低把握未確認',
        guards: '低把握是建議檢查，不是硬門檻。',
        breaksIf: '有人把「未確認」也變成不能送出。',
      },
      {
        id: 'no-fields',
        name: '沒有任何欄位時不能送出',
        guards: '空清單不能當已審核結果送出。',
        breaksIf: '有人讓 canSubmit([]) 回 true。',
      },
      {
        id: 'absent-labels',
        name: '三個必填標籤還沒全部出現時不能送出',
        guards: '解析中途只抽到品名，不能先送。',
        breaksIf: '有人只檢查「已出現的必填有沒有值」，不管另外兩個還沒到。',
      },
      {
        id: 'whitespace',
        name: '必填只填空白字元仍視為缺漏',
        guards: '空白不等於有填。',
        breaksIf: '有人只檢查 value !== \'\'，沒有 trim。',
      },
    ],
  },
  {
    id: 'initial',
    title: '抽出欄位的初始狀態',
    file: 'web/src/lib/fields.test.ts',
    cases: [
      {
        id: 'high-confidence',
        name: '高把握、沒有候選的欄位預設已接受',
        guards: '上百欄不能每列都逼人按確認。',
        breaksIf: '有人讓所有欄位一進來都是 pending。',
      },
      {
        id: 'needs-pending',
        name: '低把握、缺漏、多候選都要進待確認',
        guards: '真正需要人看的列要被標出來。',
        breaksIf: '有人把低把握也預設成 accepted。',
      },
    ],
  },
  {
    id: 'group',
    title: '群組：交錯到達仍要同組排在一起',
    file: 'web/src/lib/fields.test.ts',
    cases: [
      {
        id: 'interleave',
        name: '交錯到達的欄位會依群組歸位，組內維持到達順序',
        guards: '後端照文件順序回，前端要自己把同組收在一起。',
        breaksIf: '有人改成分頁表格、或分組時打亂組內順序。',
      },
    ],
  },
  {
    id: 'edit',
    title: '修改與確認',
    file: 'web/src/lib/fields.test.ts',
    cases: [
      {
        id: 'fill-then-submit',
        name: '把缺漏的必填補上之後就可以送出',
        guards: '使用者補完有效日期後，送出要亮起來。',
        breaksIf: '有人更新值卻沒重算 canSubmit / status。',
      },
      {
        id: 'clear-blocks',
        name: '把已填的必填清掉會再次擋送出',
        guards: '填了又刪光，要回到不能送。',
        breaksIf: '有人清掉值後仍當成 accepted。',
      },
      {
        id: 'cannot-accept-empty',
        name: '空的必填不能被標成已確認',
        guards: 'acceptField 本身也要擋，不能只靠隱藏按鈕。',
        breaksIf: '有人讓空必填按確認就變 accepted。',
      },
      {
        id: 'pick-candidate',
        name: '選候選值會接受該欄，選到非首選會標成已修改',
        guards: '選系統首選是 accepted；選另一個是 edited。',
        breaksIf: '有人選了候選卻還停在 pending，或一律標 edited。',
      },
      {
        id: 'reset',
        name: '重設會回到系統抽出的值與待確認狀態',
        guards: '還原不是清空，是回到 originalValue。',
        breaksIf: '有人把重設做成刪光，或還原後忘記重算 pending。',
      },
      {
        id: 'required-row',
        name: '送出前會抽出三個法規必填的值',
        guards: '寫進 Supabase 的欄位對應品名 / 有效日期 / 廠商名稱。',
        breaksIf: '有人改 label 對應或 trim 邏輯，存進去的值會錯。',
      },
    ],
  },
  {
    id: 'sse',
    title: 'SSE 事件解析',
    file: 'web/src/lib/sse.test.ts',
    cases: [
      {
        id: 'event-names',
        name: '能解析 stage / field / error / done',
        guards: '事件名稱必須對得上後端 README。',
        breaksIf: '有人把 event: field 認成別的字，整條解析鏈會停。',
      },
      {
        id: 'bad-json',
        name: '註解行與壞掉的 JSON 不會炸掉後續欄位',
        guards: 'keep-alive 或半截 JSON 要跳過，不要 throw。',
        breaksIf: '有人讓 parseSseBlock 丟例外，後面的欄位全部進不來。',
      },
      {
        id: 'unknown-event',
        name: '不認識的 event 名稱回 null，不要 throw',
        guards: '後端多一種 keep-alive 名稱時，解析鏈還能繼續。',
        breaksIf: '有人對未知 event throw，整條 SSE 會斷。',
      },
    ],
  },
  {
    id: 'sse-buffer',
    title: '串流半截 chunk',
    file: 'web/src/lib/sse.test.ts',
    cases: [
      {
        id: 'split-json',
        name: 'JSON 被切成兩塊時，第一輪不吐事件，拼完才 parse',
        guards: 'fetch / proxy 把 data: 中間切開，不能當壞 JSON 丟掉。',
        breaksIf: '有人每讀到一塊就 parse，半截欄位會消失。',
      },
      {
        id: 'two-events',
        name: '同一塊裡兩個完整事件會一次吐出',
        guards: '緩衝把兩個事件拼在一起時，兩個都要進畫面。',
        breaksIf: '有人只取第一個 \\n\\n 前面，後面的 done 會丟。',
      },
    ],
  },
  {
    id: 'reduce',
    title: '解析過程的狀態累積',
    file: 'web/src/lib/sse.test.ts',
    cases: [
      {
        id: 'keep-on-error',
        name: '中途收到 error 時，已經抽出的欄位要留下來',
        guards: '解析掛掉不能把畫面清空。',
        breaksIf: '有人在 error 時 reset 成 initialExtractState。',
      },
      {
        id: 'append',
        name: '欄位是一筆一筆累加，不會覆蓋先前結果',
        guards: '新的 field 是 append，不是替換。',
        breaksIf: '有人寫成 fields: [newField]，舊的會消失。',
      },
      {
        id: 'done-flag',
        name: '收到 done 之後 done 為 true',
        guards: '解析沒結束不能送；done 沒設起來，送出鍵會一直暗。',
        breaksIf: '有人處理 done 事件卻忘了設 done: true。',
      },
    ],
  },
]

export const TEST_COUNT = TEST_GROUPS.reduce((sum, group) => sum + group.cases.length, 0)
