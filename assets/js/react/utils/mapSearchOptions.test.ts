import { describe, expect, it } from "vitest"
import { buildMapSearchOptions } from "./mapSearchOptions"
import type { PlaceSuggestion } from "./placeSearch"
import type { Pin } from "../types"

function pin(id: number, title: string): Pin {
  return {
    id,
    title,
    latitude: 0,
    longitude: 0,
    pin_type: "one_time",
    status: "approved",
    tags: [],
  }
}

function place(id: string, name: string): PlaceSuggestion {
  return { id, name, label: name, longitude: 1, latitude: 2 }
}

describe("buildMapSearchOptions", () => {
  it("orders pins before places", () => {
    const options = buildMapSearchOptions(
      [pin(1, "Cafe"), pin(2, "Park")],
      [place("p1", "Paris"), place("p2", "Portland")],
    )
    expect(options.map((o) => o.kind)).toEqual(["pin", "pin", "place", "place"])
    expect(options[0].kind === "pin" && options[0].pin.title).toBe("Cafe")
    expect(options[2].kind === "place" && options[2].place.name).toBe("Paris")
  })

  it("handles empty groups", () => {
    expect(buildMapSearchOptions([], [])).toEqual([])
    expect(buildMapSearchOptions([pin(1, "A")], []).map((o) => o.kind)).toEqual(["pin"])
    expect(buildMapSearchOptions([], [place("x", "X")]).map((o) => o.kind)).toEqual(["place"])
  })
})
