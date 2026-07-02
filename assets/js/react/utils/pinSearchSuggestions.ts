import type { CustomPinType, Pin } from "../types"
import type { PinFilterMatcher } from "../components/map/filters"
import { pinMatchesQuery } from "../components/map/filters"
import { customFieldSearchHits } from "./customFieldSearch"

const PIN_SEARCH_MAX_SUGGESTIONS = 8

export type SearchPinSuggestionsOptions = {
  limit?: number
  pinMatches?: PinFilterMatcher
}

function rankPin(pin: Pin, query: string, catalog: CustomPinType[]): number {
  const q = query.trim().toLowerCase()
  const title = pin.title.toLowerCase()
  if (title.startsWith(q)) return 0
  if (title.includes(q)) return 1
  if (pin.tags?.some((t) => t.toLowerCase().includes(q))) return 2
  if (customFieldSearchHits(pin, catalog).some((h) => h.text.toLowerCase().includes(q))) return 3
  if (pin.description?.toLowerCase().includes(q)) return 4
  return 5
}

/** Ranked pin matches for autocomplete (same logic as the map search box). */
export function searchPinSuggestions(
  pins: Pin[],
  query: string,
  catalog: CustomPinType[],
  options: SearchPinSuggestionsOptions = {},
): Pin[] {
  const { limit = PIN_SEARCH_MAX_SUGGESTIONS, pinMatches } = options
  const q = query.trim()
  if (q === "") return []
  return pins
    .filter((p) => pinMatchesQuery(p, q, catalog, pins))
    .filter((p) => pinMatches?.(p) ?? true)
    .sort((a, b) => {
      const ra = rankPin(a, q, catalog)
      const rb = rankPin(b, q, catalog)
      if (ra !== rb) return ra - rb
      return a.title.localeCompare(b.title)
    })
    .slice(0, limit)
}
