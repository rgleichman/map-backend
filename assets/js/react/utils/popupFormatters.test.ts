import { describe, expect, it } from "vitest"
import { formatCommentTimestamp } from "./popupFormatters"

const timestampOpts = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
} as const

describe("formatCommentTimestamp", () => {
  it("formats a Z-suffixed UTC instant in the viewer's local timezone", () => {
    const iso = "2026-10-28T18:00:00Z"
    expect(formatCommentTimestamp(iso)).toBe(new Date(iso).toLocaleString(undefined, timestampOpts))
  })

  it("treats timezone-less ISO as local rather than UTC", () => {
    const localIso = "2026-10-28T18:00:00"
    const utcIso = "2026-10-28T18:00:00Z"
    expect(formatCommentTimestamp(localIso)).toBe(
      new Date(localIso).toLocaleString(undefined, timestampOpts),
    )
    if (new Date().getTimezoneOffset() !== 0) {
      expect(formatCommentTimestamp(localIso)).not.toBe(formatCommentTimestamp(utcIso))
    }
  })

  it("returns the original string when parsing fails", () => {
    expect(formatCommentTimestamp("not-a-date")).toBe("not-a-date")
  })
})
