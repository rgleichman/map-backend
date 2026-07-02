import { describe, expect, it } from "vitest"
import type { Pin } from "../types"
import { createPinFilterMatcher } from "../components/map/filters"
import { searchPinSuggestions } from "./pinSearchSuggestions"

const pin = (id: number, title: string, extra: Partial<Pin> = {}): Pin => ({
  id,
  title,
  latitude: 0,
  longitude: 0,
  pin_type: "other",
  status: "approved",
  tags: [],
  ...extra,
})

describe("searchPinSuggestions", () => {
  const pins = [
    pin(1, "Joe's Pizza"),
    pin(2, "City Park", { description: "great picnic spot" }),
    pin(3, "Arcade", { tags: ["games"] }),
  ]

  it("matches title like map search", () => {
    expect(searchPinSuggestions(pins, "pizza", []).map((p) => p.id)).toEqual([1])
  })

  it("matches description and tags", () => {
    expect(searchPinSuggestions(pins, "picnic", []).map((p) => p.id)).toEqual([2])
    expect(searchPinSuggestions(pins, "games", []).map((p) => p.id)).toEqual([3])
  })

  it("returns empty for blank query", () => {
    expect(searchPinSuggestions(pins, "   ", [])).toEqual([])
  })

  it("respects pinMatches", () => {
    const hearted = new Set([2])
    const filter = { tag: null, time: "now" as const, pinType: null, query: "", heartedOnly: true }
    const pinMatches = createPinFilterMatcher(pins, filter, [], hearted)
    const filtered = searchPinSuggestions(pins, "park", [], { pinMatches })
    expect(filtered.map((p) => p.id)).toEqual([2])

    const unhearted = searchPinSuggestions(pins, "park", [], {
      pinMatches: createPinFilterMatcher(pins, filter, [], new Set()),
    })
    expect(unhearted).toEqual([])
  })
})
