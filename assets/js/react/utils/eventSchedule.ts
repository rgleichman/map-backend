import { addHoursToParts, type DateTimeParts } from "./datetime"

const pad2 = (n: number) => String(n).padStart(2, "0")

/** Minutes between same-day event end-time list slots. */
export const EVENT_TIME_SLOT_MINUTES = 15

/** Last same-day slot shown in the end-time list (11:45 PM). */
export const LAST_SAME_DAY_SLOT_MINUTES = 23 * 60 + 45

export const DIFFERENT_DAY_LABEL = "Different day"

export type LocalDateTimeParts = {
  date: string
  time: string
}

export function parseHHmm(value: string): { hour: number; minute: number } | null {
  if (!value) return null
  const match = value.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  const hour = parseInt(match[1], 10)
  const minute = parseInt(match[2], 10)
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return { hour, minute }
}

export function formatHHmm(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`
}

/** Split a datetime-local `YYYY-MM-DDTHH:mm` (optional seconds) into date + `HH:mm`. */
export function splitLocalDateTime(value: string): LocalDateTimeParts | null {
  if (!value) return null
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{1,2}:\d{2})/)
  if (!match) return null
  const time = parseHHmm(match[2])
  if (!time) return null
  return { date: match[1], time: formatHHmm(time.hour, time.minute) }
}

export function joinLocalDateTime(date: string, time: string): string {
  const parsed = parseHHmm(time)
  const hhmm = parsed ? formatHHmm(parsed.hour, parsed.minute) : "00:00"
  return `${date}T${hhmm}`
}

export function isValidDateInput(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
}

export function isSameCalendarDay(startTime: string, endTime: string): boolean {
  const start = splitLocalDateTime(startTime)
  const end = splitLocalDateTime(endTime)
  if (!start || !end) return true
  return start.date === end.date
}

export function addDaysToDate(date: string, days: number): string {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return date
  const year = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  const day = parseInt(match[3], 10)
  const utc = new Date(Date.UTC(year, month - 1, day + days))
  return `${utc.getUTCFullYear()}-${pad2(utc.getUTCMonth() + 1)}-${pad2(utc.getUTCDate())}`
}

function toDateTimeParts(value: string): DateTimeParts | null {
  const split = splitLocalDateTime(value)
  if (!split) return null
  const dateMatch = split.date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const time = parseHHmm(split.time)
  if (!dateMatch || !time) return null
  return {
    year: parseInt(dateMatch[1], 10),
    month: parseInt(dateMatch[2], 10),
    day: parseInt(dateMatch[3], 10),
    hour: time.hour,
    minute: time.minute,
  }
}

function fromDateTimeParts(parts: DateTimeParts): string {
  return joinLocalDateTime(
    `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`,
    formatHHmm(parts.hour, parts.minute)
  )
}

export function addHoursToLocalDateTime(value: string, hours: number): string | null {
  const parts = toDateTimeParts(value)
  if (!parts) return null
  return fromDateTimeParts(addHoursToParts(parts, hours))
}

/** Next-day 00:00 — continuation past the last same-day end slot. */
export function enterMultiDayEnd(startDateTime: string): string {
  const start = splitLocalDateTime(startDateTime)
  if (!start) return ""
  return joinLocalDateTime(addDaysToDate(start.date, 1), "00:00")
}

/**
 * If `endTime` is missing or not after `startTime`, bump to start + 1 hour.
 * Crossing midnight uses next-day 00:00 (multi-day escape).
 */
export function bumpEndIfNeeded(startTime: string, endTime: string): string {
  if (!startTime) return endTime
  if (endTime && endTime > startTime) return endTime
  const plusOne = addHoursToLocalDateTime(startTime, 1)
  if (!plusOne) return enterMultiDayEnd(startTime)
  const start = splitLocalDateTime(startTime)
  const plus = splitLocalDateTime(plusOne)
  if (start && plus && plus.date !== start.date) {
    return enterMultiDayEnd(startTime)
  }
  return plusOne
}

export function applySingleDate(
  startTime: string,
  endTime: string,
  newDate: string
): { startTime: string; endTime: string } {
  if (!isValidDateInput(newDate)) return { startTime, endTime }
  const start = splitLocalDateTime(startTime)
  const end = splitLocalDateTime(endTime)
  const nextStart = joinLocalDateTime(newDate, start?.time ?? "00:00")
  const nextEnd = joinLocalDateTime(newDate, end?.time ?? "01:00")
  return { startTime: nextStart, endTime: bumpEndIfNeeded(nextStart, nextEnd) }
}

export function applyStartDate(
  startTime: string,
  endTime: string,
  newDate: string
): { startTime: string; endTime: string } {
  if (!isValidDateInput(newDate)) return { startTime, endTime }
  const start = splitLocalDateTime(startTime)
  const nextStart = joinLocalDateTime(newDate, start?.time ?? "00:00")
  return { startTime: nextStart, endTime: bumpEndIfNeeded(nextStart, endTime) }
}

export function applyEndDate(
  startTime: string,
  endTime: string,
  newDate: string
): { startTime: string; endTime: string } {
  if (!isValidDateInput(newDate)) return { startTime, endTime }
  const start = splitLocalDateTime(startTime)
  const end = splitLocalDateTime(endTime)
  const clampedDate =
    start && newDate < start.date ? start.date : newDate
  const nextEnd = joinLocalDateTime(clampedDate, end?.time ?? "00:00")
  return { startTime, endTime: bumpEndIfNeeded(startTime, nextEnd) }
}

export function applyStartTimeOfDay(
  startTime: string,
  endTime: string,
  newTime: string
): { startTime: string; endTime: string } {
  const start = splitLocalDateTime(startTime)
  const end = splitLocalDateTime(endTime)
  const date = start?.date ?? end?.date
  if (!date || !parseHHmm(newTime)) return { startTime, endTime }
  const nextStart = joinLocalDateTime(date, newTime)
  return { startTime: nextStart, endTime: bumpEndIfNeeded(nextStart, endTime) }
}

export function applyEndTimeOfDay(
  startTime: string,
  endTime: string,
  newTime: string
): string {
  const start = splitLocalDateTime(startTime)
  const end = splitLocalDateTime(endTime)
  const date = end?.date ?? start?.date
  if (!date || !parseHHmm(newTime)) return endTime
  return joinLocalDateTime(date, newTime)
}

export function applyExpandToMultiDay(
  startTime: string
): { startTime: string; endTime: string } {
  return { startTime, endTime: enterMultiDayEnd(startTime) }
}

function minutesOf(hhmm: string): number | null {
  const parsed = parseHHmm(hhmm)
  if (!parsed) return null
  return parsed.hour * 60 + parsed.minute
}

function fromMinutes(total: number): string {
  const hour = Math.floor(total / 60)
  const minute = total % 60
  return formatHHmm(hour, minute)
}

/** All 15-minute times from midnight through 11:45 PM. */
export function dayTimeSlots(): string[] {
  const slots: string[] = []
  for (let m = 0; m <= LAST_SAME_DAY_SLOT_MINUTES; m += EVENT_TIME_SLOT_MINUTES) {
    slots.push(fromMinutes(m))
  }
  return slots
}

/** 15-minute times strictly after `startHHmm`, through 11:45 PM. */
export function endTimeSlotsAfter(startHHmm: string): string[] {
  const start = minutesOf(startHHmm)
  if (start == null) return []
  const first =
    Math.floor(start / EVENT_TIME_SLOT_MINUTES) * EVENT_TIME_SLOT_MINUTES +
    EVENT_TIME_SLOT_MINUTES
  return dayTimeSlots().filter((slot) => {
    const minutes = minutesOf(slot)
    return minutes != null && minutes >= first
  })
}

/** 12-hour label for a list slot (`10:15` → `10:15 AM`). */
export function formatTimeSlotLabel(hhmm: string): string {
  const parsed = parseHHmm(hhmm)
  if (!parsed) return hhmm
  const suffix = parsed.hour < 12 ? "AM" : "PM"
  const hour12 = parsed.hour % 12 === 0 ? 12 : parsed.hour % 12
  return `${hour12}:${pad2(parsed.minute)} ${suffix}`
}

/**
 * True when the user has actually scrolled (`scrollTop > 0`) and reached the
 * bottom. Visible last rows without scrolling must not expand to multi-day.
 */
export function endTimeListScrolledToBottom(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  thresholdPx = 8
): boolean {
  if (scrollTop <= 0) return false
  return scrollTop + clientHeight >= scrollHeight - thresholdPx
}
