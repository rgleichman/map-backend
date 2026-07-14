import type { Pin } from "../types"
import { isCommunityTag } from "./pinMapUrl"

export { isCommunityTag }

const DEFAULT_TAG_SUGGESTION_LIMIT = 20

export type SearchTagSuggestionsOptions = {
  exclude?: Iterable<string>
  omitCommunityTags?: boolean
  limit?: number
}

/** Unique, sorted tag names from loaded map pins. */
export function deriveMapTags(pins: Pin[]): string[] {
  return [...new Set(pins.flatMap((p) => p.tags ?? []))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  )
}

function normalizedExclude(exclude?: Iterable<string>): Set<string> {
  const set = new Set<string>()
  if (!exclude) return set
  for (const tag of exclude) {
    set.add(tag.trim().toLowerCase())
  }
  return set
}

/**
 * Suggest existing tags for autocomplete.
 * Empty query returns the first N tags (browse-on-focus); otherwise case-insensitive substring match.
 */
export function searchTagSuggestions(
  allTags: string[],
  query: string,
  options: SearchTagSuggestionsOptions = {},
): string[] {
  const { omitCommunityTags = false, limit = DEFAULT_TAG_SUGGESTION_LIMIT } = options
  const excluded = normalizedExclude(options.exclude)
  const q = query.trim().toLowerCase()

  let candidates = allTags.filter((tag) => {
    if (excluded.has(tag.toLowerCase())) return false
    if (omitCommunityTags && isCommunityTag(tag)) return false
    return true
  })

  if (q !== "") {
    candidates = candidates.filter((tag) => tag.toLowerCase().includes(q))
  }

  return candidates.slice(0, limit)
}
