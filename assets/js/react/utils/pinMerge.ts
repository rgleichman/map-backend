import type { Pin } from "../types"

/**
 * Channel / PinJSON.data omit viewer-relative fields; authenticated HTTP includes them.
 * Absent means unknown — never clobber a known true with a hardcoded false.
 */
export function mergePin(existing: Pin, incoming: Pin): Pin {
  return {
    ...incoming,
    is_owner: incoming.is_owner ?? existing.is_owner ?? false,
    created_by_me: incoming.created_by_me ?? existing.created_by_me ?? false,
    inserted_at: incoming.inserted_at ?? existing.inserted_at,
    updated_at: incoming.updated_at ?? existing.updated_at,
  }
}

/** Normalize viewer fields on insert (create HTTP keeps true; channel defaults to false). */
export function normalizePinForInsert(incoming: Pin): Pin {
  return {
    ...incoming,
    is_owner: incoming.is_owner ?? false,
    created_by_me: incoming.created_by_me ?? false,
  }
}

export function upsertPinIntoList(pins: Pin[], incoming: Pin): Pin[] {
  const existingIndex = pins.findIndex((p) => p.id === incoming.id)
  if (existingIndex >= 0) {
    const updated = [...pins]
    updated[existingIndex] = mergePin(pins[existingIndex], incoming)
    return updated
  }
  return [...pins, normalizePinForInsert(incoming)]
}
