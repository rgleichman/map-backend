import { RRule } from "rrule"
import type { Pin } from "../types"

export const SENTINEL_DATE_PREFIX = "2000-01-01T"

export function rruleToHumanReadable(rruleStr: string): string {
  try {
    return RRule.fromString(rruleStr).toText()
  } catch {
    return rruleStr
  }
}

export function formatDateTime(iso?: string): string {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    const timeStr = d.toLocaleString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })
    if (iso.startsWith(SENTINEL_DATE_PREFIX)) return timeStr
    const dateStr = d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" })
    return `${dateStr}, ${timeStr}`
  } catch {
    return iso
  }
}

export function buildOpenInMapsUrl(userAgent: string, pin: Pin): string {
  if (/iPhone|iPad|iPod/.test(userAgent)) {
    return `https://maps.apple.com/place?coordinate=${pin.latitude},${pin.longitude}&name=${encodeURIComponent(pin.title)}`
  }
  if (/Android/.test(userAgent)) {
    return `geo:${pin.latitude},${pin.longitude}?q=${pin.latitude},${pin.longitude}(${encodeURIComponent(pin.title)})`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pin.latitude},${pin.longitude}`)}`
}
