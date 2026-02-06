const pad2 = (n: number) => String(n).padStart(2, "0")

// <input type="datetime-local"> expects a LOCAL "YYYY-MM-DDTHH:mm" string.
export function dateToLocalInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function isoToLocalInputValue(s?: string): string {
  return s ? dateToLocalInputValue(new Date(s)) : ""
}

export function localInputValueToISOString(s: string): string | undefined {
  return s ? new Date(s).toISOString() : undefined
}

// Time-only "HH:mm" (e.g. from type="time") -> ISO with sentinel date for API.
const SENTINEL_DATE = "2000-01-01"
export function timeOnlyToISOString(timeValue: string): string | undefined {
  if (!timeValue || timeValue.length < 5) return undefined
  const [h, m] = timeValue.split(":").map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return undefined
  const hour = Math.max(0, Math.min(23, h))
  const minute = Math.max(0, Math.min(59, m))
  return `${SENTINEL_DATE}T${pad2(hour)}:${pad2(minute)}:00.000Z`
}

// ISO string -> "HH:mm" (extract time part).
export function isoToTimeOnly(iso?: string): string {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`
  } catch {
    return ""
  }
}

