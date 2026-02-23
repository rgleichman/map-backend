import { RRule } from "rrule"
import type { Pin } from "../../types"
import {
  addHoursToParts,
  getNowInTimezone,
  getWeekdayInTimezone,
  parseDateTimeFromISO,
  parseTimeOnlyFromISO,
  partsGte,
  partsLte,
} from "../../utils/datetime"

export type TimeFilter = "now" | null

export type FilterState = {
  tag: string | null
  time: TimeFilter
}

/** Map opens with this (open now selected). */
export const DEFAULT_FILTER: FilterState = { tag: null, time: "now" }
/** Clear all = show all pins (no tag, no time filter). */
export const CLEARED_FILTER: FilterState = { tag: null, time: null }

function toMinutes(h: number, m: number): number {
  return h * 60 + m
}

function timeOnlyInRange(
  nowHour: number,
  nowMinute: number,
  start: { hour: number; minute: number } | null,
  end: { hour: number; minute: number } | null
): boolean {
  const nowM = toMinutes(nowHour, nowMinute)
  if (start && end) {
    const s = toMinutes(start.hour, start.minute)
    const e = toMinutes(end.hour, end.minute)
    return nowM >= s && nowM <= e
  }
  if (start) {
    return nowM >= toMinutes(start.hour, start.minute)
  }
  if (end) {
    return nowM <= toMinutes(end.hour, end.minute)
  }
  return true
}

/** True if time (hour, minute) falls in [rangeStart, rangeEnd], allowing the range to wrap across midnight. */
function timeOnlyInRangeWrapping(
  time: { hour: number; minute: number },
  rangeStart: { hour: number; minute: number },
  rangeEnd: { hour: number; minute: number }
): boolean {
  const timeM = toMinutes(time.hour, time.minute)
  const startM = toMinutes(rangeStart.hour, rangeStart.minute)
  const endM = toMinutes(rangeEnd.hour, rangeEnd.minute)
  if (endM >= startM) return timeM >= startM && timeM <= endM
  return timeM >= startM || timeM <= endM
}

function getWeekdaysFromRrule(rruleStr: string): number[] | null {
  try {
    const rule = RRule.fromString(rruleStr)
    const raw = rule.options?.byweekday
    if (!Array.isArray(raw) || raw.length === 0) return null
    return raw.map((w: number | { weekday: number }) =>
      typeof w === "number" ? w : w.weekday
    )
  } catch {
    return null
  }
}

/** True if the given calendar date (in pin's TZ) is one of the RRULE BYDAY weekdays. */
function isRecurrenceDayForParts(
  parts: { year: number; month: number; day: number },
  rruleStr: string,
  ianaTimezone: string
): boolean {
  const weekdays = getWeekdaysFromRrule(rruleStr)
  if (!weekdays) return false
  const rruleWeekday = getWeekdayInTimezone(
    parts.year,
    parts.month,
    parts.day,
    ianaTimezone
  )
  return rruleWeekday !== null && weekdays.includes(rruleWeekday)
}

/** True if "today" in the pin's timezone is one of the RRULE BYDAY weekdays. Exported for testing. */
export function isTodayRecurrenceDay(rruleStr: string, ianaTimezone: string): boolean {
  const nowParts = getNowInTimezone(ianaTimezone)
  if (!nowParts) return false
  return isRecurrenceDayForParts(nowParts, rruleStr, ianaTimezone)
}

export function filterPins(pins: Pin[], filter: FilterState): Pin[] {
  return pins.filter((p) => {
    if (filter.tag && (!p.tags || !p.tags.includes(filter.tag))) {
      return false
    }

    if (filter.time !== "now") return true

    if (!p.schedule_timezone) return true
    if (!p.start_time && !p.end_time && !p.schedule_rrule) return true

    const nowParts = getNowInTimezone(p.schedule_timezone)
    if (!nowParts) return true

    const nowPlus2hParts = addHoursToParts(nowParts, 2)

    if (p.pin_type === "one_time") {
      const startParts = p.start_time ? parseDateTimeFromISO(p.start_time) : null
      const endParts = p.end_time ? parseDateTimeFromISO(p.end_time) : null
      if (!startParts && !endParts) return true
      if (startParts && !partsLte(startParts, nowPlus2hParts)) return false
      if (endParts && partsGte(nowParts, endParts)) return false
      return true
    }
    if (p.schedule_rrule?.trim()) {
      const startTime = p.start_time ? parseTimeOnlyFromISO(p.start_time) : null
      const endTime = p.end_time ? parseTimeOnlyFromISO(p.end_time) : null
      const inTimeWindow = timeOnlyInRange(nowParts.hour, nowParts.minute, startTime, endTime)
      const nowTime = { hour: nowParts.hour, minute: nowParts.minute }
      const nowPlus2hTime = { hour: nowPlus2hParts.hour, minute: nowPlus2hParts.minute }
      const opensWithin2h =
        startTime &&
        timeOnlyInRangeWrapping(startTime, nowTime, nowPlus2hTime)
      const windowCrossesMidnight =
        nowParts.year !== nowPlus2hParts.year ||
        nowParts.month !== nowPlus2hParts.month ||
        nowParts.day !== nowPlus2hParts.day
      const opensWithin2hNextDay =
        windowCrossesMidnight &&
        startTime &&
        isRecurrenceDayForParts(nowPlus2hParts, p.schedule_rrule, p.schedule_timezone) &&
        timeOnlyInRange(startTime.hour, startTime.minute, { hour: 0, minute: 0 }, nowPlus2hTime)
      return (
        (isTodayRecurrenceDay(p.schedule_rrule, p.schedule_timezone) &&
          (inTimeWindow || !!opensWithin2h)) ||
        !!opensWithin2hNextDay
      )
    }
    return true
  })
}
