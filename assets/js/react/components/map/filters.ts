import type { Pin } from "../../types"

export type TimeFilter = "now" | null

export type FilterState = {
  tag: string | null
  time: TimeFilter
}

/** Map opens with this (open now selected). */
export const DEFAULT_FILTER: FilterState = { tag: null, time: "now" }
/** Clear all = show all pins (no tag, no time filter). */
export const CLEARED_FILTER: FilterState = { tag: null, time: null }

export function filterPins(pins: Pin[], filter: FilterState): Pin[] {
  return pins.filter((p) => {
    if (filter.tag && (!p.tags || !p.tags.includes(filter.tag))) {
      return false
    }

    if (filter.time === "now") {
      const now = new Date()
      if (!p.start_time && !p.end_time) return true
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
