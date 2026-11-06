const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const

/**
 * Short age label for list rows. Buckets match `PinLive.Index.format_relative_time/1`:
 * just now, minutes, hours, days, then `on Mon DD, YYYY` from the UTC calendar date.
 */
export function formatRelativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (iso == null || iso === "") return ""
  const then = new Date(iso)
  const thenMs = then.getTime()
  if (!Number.isFinite(thenMs)) return ""

  const seconds = Math.trunc((now.getTime() - thenMs) / 1000)
  if (seconds < 60) return "just now"

  if (seconds < 3600) {
    const minutes = Math.trunc(seconds / 60)
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  }

  if (seconds < 86_400) {
    const hours = Math.trunc(seconds / 3600)
    return `${hours} hour${hours === 1 ? "" : "s"} ago`
  }

  if (seconds < 604_800) {
    const days = Math.trunc(seconds / 86_400)
    return `${days} day${days === 1 ? "" : "s"} ago`
  }

  const day = String(then.getUTCDate()).padStart(2, "0")
  return `on ${MONTHS[then.getUTCMonth()]} ${day}, ${then.getUTCFullYear()}`
}
