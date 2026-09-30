import type { Pin } from "../types"
import { formatDateTime, rruleToHumanReadable, SENTINEL_DATE_PREFIX } from "./popupFormatters"

/** Geographic viewport from MapLibre `getBounds()` (may cross the antimeridian). */
export type MapBounds = {
  west: number
  south: number
  east: number
  north: number
}

/** True when the pin has any stored schedule columns. */
export function pinHasScheduleFields(pin: {
  start_time?: string | null
  end_time?: string | null
  schedule_rrule?: string | null
}): boolean {
  return !!(pin.start_time || pin.end_time || pin.schedule_rrule)
}

function formatTimeOnly(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })
}

function isSameLocalCalendarDay(a: string, b: string): boolean {
  const da = new Date(a)
  const db = new Date(b)
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

/**
 * Short one-line schedule text for list rows (hover “When” / “Schedule” semantics).
 * Empty when the pin has no schedule fields.
 * Same local calendar day: one date + start/end times (e.g. "Jun 1, 2026, 3:00 PM – 5:00 PM").
 */
export function formatPinScheduleSummary(pin: {
  start_time?: string | null
  end_time?: string | null
  schedule_rrule?: string | null
}): string {
  let times = ""
  if (pin.start_time && pin.end_time) {
    times = isSameLocalCalendarDay(pin.start_time, pin.end_time)
      ? `${formatDateTime(pin.start_time)} – ${formatTimeOnly(pin.end_time)}`
      : `${formatDateTime(pin.start_time)} – ${formatDateTime(pin.end_time)}`
  } else if (pin.start_time) {
    times = formatDateTime(pin.start_time)
  } else if (pin.end_time) {
    times = formatDateTime(pin.end_time)
  }

  const rrule = pin.schedule_rrule?.trim()
    ? rruleToHumanReadable(pin.schedule_rrule.trim())
    : ""

  if (times && rrule) return `${times} · ${rrule}`
  return times || rrule
}

/** True when lat/lng fall inside bounds (handles west > east antimeridian wrap). */
export function pinInMapBounds(latitude: number, longitude: number, bounds: MapBounds): boolean {
  if (latitude < bounds.south || latitude > bounds.north) return false
  if (bounds.west <= bounds.east) {
    return longitude >= bounds.west && longitude <= bounds.east
  }
  return longitude >= bounds.west || longitude <= bounds.east
}

function startTimeSortKey(iso: string | null | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY
  const t = Date.parse(iso)
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t
}

/**
 * True when a one-shot (non-recurring) schedule has an absolute end in the past.
 * Recurring pins and time-only sentinel end times are never treated as ended here.
 */
export function pinOneShotScheduleEndedInPast(
  pin: {
    end_time?: string | null
    schedule_rrule?: string | null
  },
  now: Date = new Date(),
): boolean {
  if (pin.schedule_rrule?.trim()) return false
  const endIso = pin.end_time
  if (!endIso || endIso.startsWith(SENTINEL_DATE_PREFIX)) return false
  const endMs = Date.parse(endIso)
  if (Number.isNaN(endMs)) return false
  return endMs <= now.getTime()
}

/** Timed pins inside the viewport, sorted by start_time ascending (missing last). */
export function listTimedPinsInView(
  pins: Pin[],
  bounds: MapBounds | null,
  now: Date = new Date(),
): Pin[] {
  if (!bounds) return []
  return pins
    .filter(
      (p) =>
        pinHasScheduleFields(p) &&
        !pinOneShotScheduleEndedInPast(p, now) &&
        pinInMapBounds(p.latitude, p.longitude, bounds),
    )
    .sort((a, b) => {
      const byStart = startTimeSortKey(a.start_time) - startTimeSortKey(b.start_time)
      if (byStart !== 0) return byStart
      const byTitle = a.title.localeCompare(b.title)
      if (byTitle !== 0) return byTitle
      return a.id - b.id
    })
}
