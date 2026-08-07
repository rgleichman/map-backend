import type { Pin } from "../types"
import { upsertPinIntoList } from "./pinMerge"

export type MarkerDeletedRefetchResult =
  | { kind: "ok"; pin: Pin }
  | { kind: "not_found" }
  | { kind: "error" }

/**
 * Public-channel `marker_deleted` may mean a real delete, or only that the pin left
 * the public feed (e.g. reject / pending). Creators keep their own pins in local
 * state and should re-fetch instead of dropping them blindly.
 */
export function shouldRefetchOnMarkerDeleted(pins: Pin[], pinId: number): boolean {
  const pin = pins.find((p) => p.id === pinId)
  return pin?.created_by_me === true
}

/**
 * Apply GET /api/pins/:id after marker_deleted for a created_by_me pin.
 * Prefer keeping the pin on non-404 errors so transient failures do not wipe the
 * creator's pending/rejected pin from the UI.
 */
export function applyOwnedMarkerDeletedRefetch(
  pins: Pin[],
  pinId: number,
  result: MarkerDeletedRefetchResult
): Pin[] {
  switch (result.kind) {
    case "ok":
      return upsertPinIntoList(pins, result.pin)
    case "not_found":
      return pins.filter((p) => p.id !== pinId)
    case "error":
      return pins
  }
}

/** GET /api/pins/:id; maps 404 → not_found, other failures → error. */
export async function refetchPinAfterMarkerDeleted(
  pinId: number,
  fetchPin: (id: number) => Promise<Response> = (id) => fetch(`/api/pins/${id}`)
): Promise<MarkerDeletedRefetchResult> {
  try {
    const res = await fetchPin(pinId)
    if (res.status === 404) return { kind: "not_found" }
    if (!res.ok) return { kind: "error" }
    const body = (await res.json()) as { data: Pin }
    return { kind: "ok", pin: body.data }
  } catch {
    return { kind: "error" }
  }
}
