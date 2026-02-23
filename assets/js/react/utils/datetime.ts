const pad2 = (n: number) => String(n).padStart(2, "0")

// <input type="datetime-local"> expects a LOCAL "YYYY-MM-DDTHH:mm" string.
export function dateToLocalInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function isoToLocalInputValue(s?: string): string {
  return s ? dateToLocalInputValue(new Date(s)) : ""
}

export function localInputValueToISOString(s: string): string | undefined {
  if (!s || s.length < 16) return undefined
  return `${s}:00`
}

// Time-only "HH:mm" (e.g. from type="time") -> ISO with sentinel date for API.
const SENTINEL_DATE = "2000-01-01"
export function timeOnlyToISOString(timeValue: string): string | undefined {
  if (!timeValue || timeValue.length < 5) return undefined
  const [h, m] = timeValue.split(":").map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return undefined
  const hour = Math.max(0, Math.min(23, h))
  const minute = Math.max(0, Math.min(59, m))
  return `${SENTINEL_DATE}T${pad2(hour)}:${pad2(minute)}:00`
}

// ISO string (no Z = local) -> "HH:mm" (extract time part as local).
export function isoToTimeOnly(iso?: string): string {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  } catch {
    return ""
  }
}

export type DateTimeParts = { year: number; month: number; day: number; hour: number; minute: number }

/** Current local date/time in an IANA timezone. */
export function getNowInTimezone(ianaTimezone: string): DateTimeParts | null {
  return getPartsInTimezone(new Date(), ianaTimezone)
}

/** Local date/time of a given moment in an IANA timezone. */
export function getPartsInTimezone(date: Date, ianaTimezone: string): DateTimeParts | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: ianaTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    const parts = formatter.formatToParts(date)
    const get = (name: string) => {
      const p = parts.find((x) => x.type === name)
      return p ? parseInt(p.value, 10) : NaN
    }
    const year = get("year")
    const month = get("month")
    const day = get("day")
    const hour = get("hour")
    const minute = get("minute")
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day) || Number.isNaN(hour) || Number.isNaN(minute)) return null
    return { year, month, day, hour, minute }
  } catch {
    return null
  }
}

/** Parse ISO "YYYY-MM-DDTHH:mm:ss" to time-only { hour, minute }. Sentinel date is ignored. */
export function parseTimeOnlyFromISO(iso?: string): { hour: number; minute: number } | null {
  if (!iso || iso.length < 16) return null
  const match = iso.match(/T(\d{1,2}):(\d{1,2})/)
  if (!match) return null
  const hour = parseInt(match[1], 10)
  const minute = parseInt(match[2], 10)
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return { hour, minute }
}

/** Parse ISO "YYYY-MM-DDTHH:mm:ss" to full date/time parts (month 1-12). */
export function parseDateTimeFromISO(iso?: string): DateTimeParts | null {
  if (!iso || iso.length < 19) return null
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{1,2}):(\d{1,2})/)
  if (!match) return null
  const year = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  const day = parseInt(match[3], 10)
  const hour = parseInt(match[4], 10)
  const minute = parseInt(match[5], 10)
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return { year, month, day, hour, minute }
}

function compareParts(a: DateTimeParts, b: DateTimeParts): number {
  if (a.year !== b.year) return a.year - b.year
  if (a.month !== b.month) return a.month - b.month
  if (a.day !== b.day) return a.day - b.day
  if (a.hour !== b.hour) return a.hour - b.hour
  return a.minute - b.minute
}

export function partsLte(a: DateTimeParts, b: DateTimeParts): boolean {
  return compareParts(a, b) <= 0
}

export function partsGte(a: DateTimeParts, b: DateTimeParts): boolean {
  return compareParts(a, b) >= 0
}

/** Add hours to date/time parts with day/month/year rollover. Uses UTC for consistent calendar math. */
export function addHoursToParts(parts: DateTimeParts, hours: number): DateTimeParts {
  const d = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour + hours, parts.minute)
  )
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  }
}

/** Weekday (0=MO .. 6=SU) for a Gregorian calendar date. RRule convention. Timezone-independent. */
export function getWeekdayInTimezone(
  year: number,
  month: number,
  day: number,
  _ianaTimezone: string
): number | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  let m = month
  let y = year
  if (m <= 2) {
    m += 12
    y -= 1
  }
  const q = day
  const K = y % 100
  const J = Math.floor(y / 100)
  const h = (q + Math.floor((13 * (m + 1)) / 5) + K + Math.floor(K / 4) + Math.floor(J / 4) - 2 * J) % 7
  const zeller = ((h % 7) + 7) % 7
  return (zeller + 5) % 7
}

/** Start and end of "today" in the given IANA timezone as UTC Date instances (for RRule.between). */
export function getTodayStartEndInTimezone(ianaTimezone: string): { start: Date; end: Date } | null {
  const nowParts = getNowInTimezone(ianaTimezone)
  if (!nowParts) return null
  const { year, month, day } = nowParts
  const startOfDay = findDateWithPartsInZone(year, month, day, 0, 0, ianaTimezone)
  const endOfDay = findDateWithPartsInZone(year, month, day, 23, 59, ianaTimezone)
  if (!startOfDay || !endOfDay) return null
  return { start: startOfDay, end: new Date(endOfDay.getTime() + MS_PER_MINUTE) }
}

const MS_PER_MINUTE = 60 * 1000

function findDateWithPartsInZone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  ianaTimezone: string
): Date | null {
  const target: DateTimeParts = { year, month, day, hour, minute }
  const dayStartUtc = Date.UTC(year, month - 1, day, 0, 0, 0)
  for (let offset = -14 * 60; offset <= (12 + 24) * 60; offset++) {
    const d = new Date(dayStartUtc + offset * MS_PER_MINUTE)
    const parts = getPartsInTimezone(d, ianaTimezone)
    if (parts && parts.year === target.year && parts.month === target.month && parts.day === target.day && parts.hour === target.hour && parts.minute === target.minute) return d
  }
  return null
}

