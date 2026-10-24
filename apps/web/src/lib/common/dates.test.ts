import { describe, expect, it } from "vitest"
import { formatDateTime, parseApiDate } from "./dates"

describe("dates helpers", () => {
  it("parses UTC dates sent without timezone offset as UTC", () => {
    const parsed = parseApiDate("2026-10-24T12:00:00")
    expect(parsed.toISOString()).toBe("2026-10-24T12:00:00.000Z")
  })

  it("preserves explicit timezone if provided", () => {
    const parsed = parseApiDate("2026-10-24T12:00:00Z")
    expect(parsed.toISOString()).toBe("2026-10-24T12:00:00.000Z")
  })

  it("formats date-time string consistently", () => {
    const formatted = formatDateTime("2026-10-24T14:05:00Z")
    expect(formatted).toContain("Oct 24, 2026")
  })
})
