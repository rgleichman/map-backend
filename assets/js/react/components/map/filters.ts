import { RRule } from "rrule"
import type { Pin } from "../../types"
import {
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

function timeOnlyInRange(
  nowHour: number,
  nowMinute: number,
  start: { hour: number; minute: number } | null,
  end: { hour: number; minute: number } | null
): boolean {
  const nowM = nowHour * 60 + nowMinute
  if (start && end) {
    const s = start.hour * 60 + start.minute
    const e = end.hour * 60 + end.minute
    return nowM >= s && nowM <= e
  }
  if (start) {
    const s = start.hour * 60 + start.minute
    return nowM >= s
  }
  if (end) {
    const e = end.hour * 60 + end.minute
    return nowM <= e
  }
  return true
}

/** True if "today" in the pin's timezone is one of the RRULE BYDAY weekdays. Exported for testing. */
export function isTodayRecurrenceDay(rruleStr: string, ianaTimezone: string): boolean {
  try {
    const nowParts = getNowInTimezone(ianaTimezone)
    if (!nowParts) return false
    const rruleWeekday = getWeekdayInTimezone(
      nowParts.year,
      nowParts.month,
      nowParts.day,
      ianaTimezone
    )
    if (rruleWeekday === null) return false
    const rule = RRule.fromString(rruleStr)
    const raw = rule.options?.byweekday
    if (!Array.isArray(raw) || raw.length === 0) return false
    const weekdays = raw.map((w: number | { weekday: number }) =>
      typeof w === "number" ? w : w.weekday
    )
    return weekdays.includes(rruleWeekday)
  } catch {
    return false
  }
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

    if (p.pin_type === "one_time") {
      const startParts = p.start_time ? parseDateTimeFromISO(p.start_time) : null
      const endParts = p.end_time ? parseDateTimeFromISO(p.end_time) : null
      if (!startParts && !endParts) return true
      if (startParts && !partsGte(nowParts, startParts)) return false
      if (endParts && !partsLte(nowParts, endParts)) return false
      return true
    }
    if (p.schedule_rrule?.trim()) {
      const startTime = p.start_time ? parseTimeOnlyFromISO(p.start_time) : null
      const endTime = p.end_time ? parseTimeOnlyFromISO(p.end_time) : null
      const inTimeWindow = timeOnlyInRange(nowParts.hour, nowParts.minute, startTime, endTime)
      return inTimeWindow && isTodayRecurrenceDay(p.schedule_rrule, p.schedule_timezone)
    }
    return true
  })
}
