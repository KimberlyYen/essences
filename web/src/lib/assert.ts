/** 給網頁跟 vitest 共用的斷言。失敗就 throw，讓畫面能標紅。 */
export function assertEqual(actual: unknown, expected: unknown): void {
  if (!deepEqual(actual, expected)) {
    throw new Error(`預期 ${inspect(expected)}，實際 ${inspect(actual)}`)
  }
}

export function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function inspect(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (typeof left !== typeof right) return false
  if (left === null || right === null) return left === right
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item, index) => deepEqual(item, right[index]))
  }
  if (typeof left === 'object' && typeof right === 'object') {
    const leftRecord = left as Record<string, unknown>
    const rightRecord = right as Record<string, unknown>
    const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)])
    for (const key of keys) {
      if (!deepEqual(leftRecord[key], rightRecord[key])) return false
    }
    return true
  }
  return false
}
