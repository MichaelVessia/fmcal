import { describe, expect, it } from "@codeforbreakfast/bun-test-effect"

import { truncateList } from "./truncate.ts"

describe("truncateList", () => {
  it("returns items unchanged when under limit", () => {
    const result = truncateList([1, 2, 3], 5)
    expect(result).toEqual({ items: [1, 2, 3], truncated: false, total: 3 })
  })

  it("returns items unchanged at exact limit", () => {
    const result = truncateList([1, 2, 3], 3)
    expect(result).toEqual({ items: [1, 2, 3], truncated: false, total: 3 })
  })

  it("truncates items over limit", () => {
    const result = truncateList([1, 2, 3, 4, 5], 3)
    expect(result).toEqual({ items: [1, 2, 3], truncated: true, total: 5 })
  })

  it("handles empty array", () => {
    const result = truncateList([], 10)
    expect(result).toEqual({ items: [], truncated: false, total: 0 })
  })

  it("uses default maxLength of 50", () => {
    const items = Array.from({ length: 60 }, (_, i) => i)
    const result = truncateList(items)
    expect(result.truncated).toBe(true)
    expect(result.items).toHaveLength(50)
    expect(result.total).toBe(60)
  })
})
