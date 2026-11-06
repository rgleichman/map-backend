import { describe, expect, it } from "vitest"
import { formatRelativeTime } from "./relativeTime"

const now = new Date("2026-06-15T12:00:00Z")

describe("formatRelativeTime", () => {
  it("returns empty for missing or invalid timestamps", () => {
    expect(formatRelativeTime(null, now)).toBe("")
    expect(formatRelativeTime(undefined, now)).toBe("")
    expect(formatRelativeTime("", now)).toBe("")
    expect(formatRelativeTime("not-a-date", now)).toBe("")
  })

  it("uses the same buckets as the plants catalog", () => {
    expect(formatRelativeTime("2026-06-15T11:59:30Z", now)).toBe("just now")
    expect(formatRelativeTime("2026-06-15T11:59:00Z", now)).toBe("1 minute ago")
    expect(formatRelativeTime("2026-06-15T11:58:00Z", now)).toBe("2 minutes ago")
    expect(formatRelativeTime("2026-06-15T11:00:00Z", now)).toBe("1 hour ago")
    expect(formatRelativeTime("2026-06-15T09:00:00Z", now)).toBe("3 hours ago")
    expect(formatRelativeTime("2026-06-14T12:00:00Z", now)).toBe("1 day ago")
    expect(formatRelativeTime("2026-06-12T12:00:00Z", now)).toBe("3 days ago")
  })

  it("uses the UTC calendar date once the age is a week or more", () => {
    expect(formatRelativeTime("2026-06-01T12:00:00Z", now)).toBe("on Jun 01, 2026")
    // 02:00Z is still June 1 in UTC and May 31 in the Americas.
    expect(formatRelativeTime("2026-06-01T02:00:00Z", now)).toBe("on Jun 01, 2026")
  })

  it("treats a future timestamp as just now", () => {
    expect(formatRelativeTime("2026-06-15T12:05:00Z", now)).toBe("just now")
  })
})
