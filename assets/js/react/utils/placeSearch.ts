import { GeocodingApi } from "@stadiamaps/api"

const PLACE_SEARCH_MAX = 5

/** Normalized place suggestion for the unified map search dropdown. */
export type PlaceSuggestion = {
  id: string
  name: string
  label: string
  longitude: number
  latitude: number
  /** W, S, E, N when available. */
  bbox?: [number, number, number, number]
}

const geocodingApi = new GeocodingApi()

function featureToSuggestion(
  feature: {
    geometry?: { coordinates?: number[] }
    bbox?: number[]
    properties?: { gid?: string; name?: string; label?: string }
  },
  index: number,
): PlaceSuggestion | null {
  const coords = feature.geometry?.coordinates
  if (!coords || coords.length < 2) return null
  const [longitude, latitude] = coords
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null
  const props = feature.properties ?? {}
  const name = props.name?.trim() || props.label?.trim() || "Place"
  const label = props.label?.trim() || name
  const id = props.gid ?? `place-${index}-${longitude},${latitude}`
  const bbox =
    feature.bbox?.length === 4
      ? ([feature.bbox[0], feature.bbox[1], feature.bbox[2], feature.bbox[3]] as [
        number,
        number,
        number,
        number,
      ])
      : undefined
  return { id, name, label, longitude, latitude, bbox }
}

/** Autocomplete places via Stadia Maps (domain/localhost auth). */
export async function searchPlaceSuggestions(
  query: string,
  options: { limit?: number; signal?: AbortSignal } = {},
): Promise<PlaceSuggestion[]> {
  const q = query.trim()
  if (q === "") return []
  const { limit = PLACE_SEARCH_MAX, signal } = options
  const response = await geocodingApi.autocomplete(
    { text: q, size: limit },
    { signal },
  )
  const features = response.features ?? []
  const out: PlaceSuggestion[] = []
  for (let i = 0; i < features.length; i++) {
    const suggestion = featureToSuggestion(features[i], i)
    if (suggestion) out.push(suggestion)
    if (out.length >= limit) break
  }
  return out
}
