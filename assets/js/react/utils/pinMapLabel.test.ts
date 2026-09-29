import { describe, expect, it } from "vitest"
import {
  calendarDaysBetween,
  formatCompactClock,
  formatPinMapLabel,
  formatPinMapTimeSuffix,
} from "./pinMapLabel"

/** Local ISO without Z, matching API pin schedule strings. */
function localIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

function atLocal(y: number, m: number, d: number, h = 12, min = 0): Date {
  return new Date(y, m - 1, d, h, min, 0, 0)
}

describe("formatCompactClock", () => {
  it("formats hour-only and with minutes", () => {
    expect(formatCompactClock(atLocal(2026, 9, 29, 13, 0))).toBe("1 pm")
    expect(formatCompactClock(atLocal(2026, 9, 29, 13, 30))).toBe("1:30 pm")
    expect(formatCompactClock(atLocal(2026, 9, 29, 0, 0))).toBe("12 am")
    expect(formatCompactClock(atLocal(2026, 9, 29, 12, 5))).toBe("12:05 pm")
  })
})

describe("calendarDaysBetween", () => {
  it("counts local calendar days", () => {
    const now = atLocal(2026, 9, 29, 23, 0)
    expect(calendarDaysBetween(now, atLocal(2026, 9, 29, 1, 0))).toBe(0)
    expect(calendarDaysBetween(now, atLocal(2026, 9, 30, 1, 0))).toBe(1)
    expect(calendarDaysBetween(now, atLocal(2026, 10, 6, 12, 0))).toBe(7)
  })
})

describe("formatPinMapTimeSuffix", () => {
  const now = atLocal(2026, 9, 29, 12, 0) // Tue

  it("returns null without start_time or with sentinel recurring time", () => {
    expect(formatPinMapTimeSuffix({}, now)).toBeNull()
    expect(formatPinMapTimeSuffix({ start_time: "2000-01-01T09:00:00" }, now)).toBeNull()
  })

  it("returns null when start is more than 6 days out", () => {
    const start = atLocal(2026, 10, 6, 13, 0) // 7 days later
    expect(formatPinMapTimeSuffix({ start_time: localIso(start) }, now)).toBeNull()
  })

  it("returns null for ended events", () => {
    const start = atLocal(2026, 9, 29, 9, 0)
    const end = atLocal(2026, 9, 29, 10, 0)
    expect(
      formatPinMapTimeSuffix({ start_time: localIso(start), end_time: localIso(end) }, now),
    ).toBeNull()
  })

  it("uses now for ongoing events", () => {
    const start = atLocal(2026, 9, 29, 11, 0)
    const end = atLocal(2026, 9, 29, 14, 0)
    expect(
      formatPinMapTimeSuffix({ start_time: localIso(start), end_time: localIso(end) }, now),
    ).toBe("now")
  })

  it("uses now for ongoing multi-day events that started earlier", () => {
    const start = atLocal(2026, 9, 28, 18, 0)
    const end = atLocal(2026, 9, 30, 2, 0)
    expect(
      formatPinMapTimeSuffix({ start_time: localIso(start), end_time: localIso(end) }, now),
    ).toBe("now")
  })

  it("uses today / tomorrow / weekday within 6 days", () => {
    expect(
      formatPinMapTimeSuffix({ start_time: localIso(atLocal(2026, 9, 29, 13, 0)) }, now),
    ).toBe("1 pm today")
    expect(
      formatPinMapTimeSuffix({ start_time: localIso(atLocal(2026, 9, 30, 13, 30)) }, now),
    ).toBe("1:30 pm tomorrow")
    expect(
      formatPinMapTimeSuffix({ start_time: localIso(atLocal(2026, 10, 2, 9, 0)) }, now),
    ).toBe("9 am Fri")
    expect(
      formatPinMapTimeSuffix({ start_time: localIso(atLocal(2026, 10, 5, 18, 0)) }, now),
    ).toBe("6 pm Mon")
  })
})

describe("formatPinMapLabel", () => {
  it("returns title only when there is no suffix", () => {
    expect(formatPinMapLabel("  Party  ", null, { maxLen: 36, truncate: true })).toBe("Party")
  })

  it("appends suffix without truncating when truncate is false", () => {
    const long = "A".repeat(40)
    expect(formatPinMapLabel(long, "1 pm today", { maxLen: 36, truncate: false })).toBe(
      `${long} (1 pm today)`,
    )
  })

  it("truncates title only so the suffix stays intact", () => {
    const long = "A".repeat(40)
    const label = formatPinMapLabel(long, "1 pm tomorrow", { maxLen: 36, truncate: true })
    expect(label.endsWith(" (1 pm tomorrow)")).toBe(true)
    expect(label).toHaveLength(36)
    expect(label.includes("…")).toBe(true)
  })
})
