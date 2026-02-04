import type { Pin } from "../../types"

export type TimeFilter = "now" | null

export function filterPins(pins: Pin[], tagFilter: string | null, timeFilter: TimeFilter): Pin[] {
  return pins.filter((p) => {
    // Apply tag filter
    if (tagFilter && (!p.tags || !p.tags.includes(tagFilter))) {
      return false
    }

    // Apply time filter (show pins open now by default)
    if (timeFilter === "now") {
      const now = new Date()
      if (!p.start_time && !p.end_time) return true // No time restrictions
      const start = p.start_time ? new Date(p.start_time) : null
      const end = p.end_time ? new Date(p.end_time) : null
      if (start && end) return start <= now && now <= end
      if (start) return start <= now
      if (end) return now <= end
      return true
    }

    return true
  })
}

