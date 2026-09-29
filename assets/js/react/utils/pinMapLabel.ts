import type { Pin } from "../types"
import { SENTINEL_DATE_PREFIX } from "./popupFormatters"

const MS_PER_DAY = 24 * 60 * 60 * 1000
const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

/** Compact clock for map labels: `1 pm`, `1:30 pm`. */
export function formatCompactClock(date: Date): string {
  let hour = date.getHours()
  const minute = date.getMinutes()
  const ampm = hour >= 12 ? "pm" : "am"
  hour = hour % 12
  if (hour === 0) hour = 12
  if (minute === 0) return `${hour} ${ampm}`
  return `${hour}:${String(minute).padStart(2, "0")} ${ampm}`
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Calendar-day difference from `from` to `to` in the viewer's local timezone. */
export function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((startOfLocalDay(to) - startOfLocalDay(from)) / MS_PER_DAY)
}

function isOngoing(start: Date, end: Date | null, now: Date): boolean {
  if (start.getTime() > now.getTime()) return false
  if (!end || Number.isNaN(end.getTime())) return true
  return end.getTime() > now.getTime()
}

/**
 * Relative start-time suffix for map labels (`1pm tomorrow`), or null when
 * the pin should keep a title-only label (no time / no date).
 *
 * Only one-time events with a real start within the next 6 calendar days
 * (or currently ongoing) get a suffix.
 */
export function formatPinMapTimeSuffix(
  pin: Pick<Pin, "start_time" | "end_time">,
  now: Date = new Date(),
): string | null {
  const startIso = pin.start_time
  if (!startIso || startIso.startsWith(SENTINEL_DATE_PREFIX)) return null

  const start = new Date(startIso)
  if (Number.isNaN(start.getTime())) return null

  const end = pin.end_time ? new Date(pin.end_time) : null
  const daysDiff = calendarDaysBetween(now, start)

  if (daysDiff < 0) {
    return isOngoing(start, end, now) ? "now" : null
  }

  if (daysDiff > 6) return null

  if (daysDiff === 0) {
    if (start.getTime() <= now.getTime()) {
      return isOngoing(start, end, now) ? "now" : null
    }
    return `${formatCompactClock(start)} today`
  }

  if (daysDiff === 1) {
    return `${formatCompactClock(start)} tomorrow`
  }

  return `${formatCompactClock(start)} ${SHORT_WEEKDAYS[start.getDay()]}`
}

function truncateLabelPart(text: string, max: number): string {
  const t = text.trim()
  if (max < 1) return ""
  if (t.length <= max) return t
  if (max === 1) return "…"
  return t.slice(0, max - 1) + "…"
}

/**
 * Compose a map label from title + optional time suffix.
 * When truncating, shortens the title only so the suffix stays intact.
 */
export function formatPinMapLabel(
  title: string,
  suffix: string | null,
  opts: { maxLen: number; truncate: boolean },
): string {
  const trimmed = title.trim()
  if (!suffix) {
    return opts.truncate ? truncateLabelPart(trimmed, opts.maxLen) : trimmed
  }

  const wrapped = ` (${suffix})`
  if (!opts.truncate) return `${trimmed}${wrapped}`

  const titleBudget = opts.maxLen - wrapped.length
  if (titleBudget < 1) {
    return truncateLabelPart(`${trimmed}${wrapped}`, opts.maxLen)
  }
  return `${truncateLabelPart(trimmed, titleBudget)}${wrapped}`
}
