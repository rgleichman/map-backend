import { getPin } from "../api/client"
import type { Pin } from "../types"
import { parseMapPinLink } from "../mapRoute"

/** Pin id from a map URL pasted into the related-pins field, if any. */
export function parsePinIdFromMapUrlInput(
  input: string,
  origin = typeof window !== "undefined" ? window.location.origin : ""
): number | null {
  const trimmed = input.trim()
  if (trimmed === "") return null
  return parseMapPinLink(trimmed, origin)?.pinId ?? null
}

/** Loaded pin first, then GET /api/pins/:id for cross-map links. */
export async function resolvePinForLink(pinId: number, loadedPins: Pin[]): Promise<Pin | null> {
  const cached = loadedPins.find((p) => p.id === pinId)
  if (cached) return cached

  try {
    const { data } = await getPin(pinId)
    return data
  } catch {
    return null
  }
}
