import { describe, expect, it } from "vitest"
import type { Pin } from "../types"
import { listRecentPins, RECENT_PINS_LIMIT } from "./recentPins"

function pin(overrides: Partial<Pin>): Pin {
  return {
    id: 1,
    title: "Pin",
    latitude: 0,
    longitude: 0,
    pin_type: "event",
    pin_type_id: 1,
    status: "approved",
    tags: [],
    inserted_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("listRecentPins", () => {
  it("orders by inserted_at descending and breaks ties by higher id", () => {
    const pins = [
      pin({ id: 1, title: "Older", inserted_at: "2026-01-01T00:00:00Z" }),
      pin({ id: 3, title: "Tie low", inserted_at: "2026-03-01T00:00:00Z" }),
      pin({ id: 4, title: "Tie high", inserted_at: "2026-03-01T00:00:00Z" }),
      pin({ id: 2, title: "Middle", inserted_at: "2026-02-01T00:00:00Z" }),
    ]

    expect(listRecentPins(pins).map((p) => p.id)).toEqual([4, 3, 2, 1])
  })

  it("drops pins with a missing or unparseable timestamp", () => {
    const pins = [
      pin({ id: 1, inserted_at: undefined }),
      pin({ id: 2, inserted_at: "" }),
      pin({ id: 3, inserted_at: "nope" }),
      pin({ id: 4, inserted_at: "2026-04-01T00:00:00Z" }),
    ]

    expect(listRecentPins(pins).map((p) => p.id)).toEqual([4])
  })

  it("excludes ids already shown in another rail", () => {
    const pins = [
      pin({ id: 1, inserted_at: "2026-03-01T00:00:00Z" }),
      pin({ id: 2, inserted_at: "2026-02-01T00:00:00Z" }),
    ]

    expect(listRecentPins(pins, { excludeIds: new Set([1]) }).map((p) => p.id)).toEqual([2])
  })

  it("caps the list and does not mutate the input", () => {
    const pins = Array.from({ length: RECENT_PINS_LIMIT + 5 }, (_, index) =>
      pin({
        id: index + 1,
        inserted_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      }),
    )
    const snapshot = pins.map((p) => p.id)

    const result = listRecentPins(pins)

    expect(result).toHaveLength(RECENT_PINS_LIMIT)
    expect(result[0]?.id).toBe(RECENT_PINS_LIMIT + 5)
    expect(pins.map((p) => p.id)).toEqual(snapshot)
  })

  it("honors a custom limit, including zero", () => {
    const pins = [
      pin({ id: 1, inserted_at: "2026-01-01T00:00:00Z" }),
      pin({ id: 2, inserted_at: "2026-02-01T00:00:00Z" }),
    ]

    expect(listRecentPins(pins, { limit: 1 }).map((p) => p.id)).toEqual([2])
    expect(listRecentPins(pins, { limit: 0 })).toEqual([])
  })
})
