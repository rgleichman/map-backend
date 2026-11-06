import type { Pin } from "../types"

/** How many newly planted rows the desktop rail shows. */
export const RECENT_PINS_LIMIT = 15

function insertedAtMs(pin: Pin): number | null {
  const raw = pin.inserted_at
  if (raw == null || raw === "") return null
  const ms = Date.parse(raw)
  return Number.isFinite(ms) ? ms : null
}

/**
 * Newest plants on the current map, by `inserted_at`.
 * Pins without a parseable timestamp are omitted. Equal timestamps break ties
 * by higher id. `excludeIds` drops plants already shown elsewhere (bloom rail).
 */
export function listRecentPins(
  pins: readonly Pin[],
  options?: {
    excludeIds?: ReadonlySet<number>
    limit?: number
  },
): Pin[] {
  const exclude = options?.excludeIds
  const limit = options?.limit ?? RECENT_PINS_LIMIT
  if (limit <= 0) return []

  const ranked: { pin: Pin; ms: number }[] = []
  for (const pin of pins) {
    if (exclude?.has(pin.id)) continue
    const ms = insertedAtMs(pin)
    if (ms == null) continue
    ranked.push({ pin, ms })
  }

  ranked.sort((a, b) => {
    if (a.ms !== b.ms) return b.ms - a.ms
    return b.pin.id - a.pin.id
  })

  return ranked.slice(0, limit).map((row) => row.pin)
}
