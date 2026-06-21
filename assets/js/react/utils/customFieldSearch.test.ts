import { describe, expect, it } from "vitest"
import type { CustomPinType, Pin } from "../types"
import {
  customFieldSearchHits,
  pinCustomFieldsMatchQuery,
  rawCustomDataSearchTexts,
} from "./customFieldSearch"

const musicType: CustomPinType = {
  id: 1,
  slug: "music",
  label: "Music",
  pin_type: "custom:music",
  enabled: true,
  schema: {
    fields: [
      { key: "artist", label: "Artist", type: "text" },
      { key: "genre", label: "Genre", type: "select", options: [{ value: "jazz", label: "Jazz" }] },
      { key: "track", label: "Track", type: "music" },
    ],
  },
}

function minimalPin(overrides: Partial<Pin>): Pin {
  return {
    id: 1,
    title: "Venue",
    latitude: 0,
    longitude: 0,
    pin_type: "custom:music",
    tags: [],
    ...overrides,
  }
}

describe("rawCustomDataSearchTexts", () => {
  it("extracts primitive and list values", () => {
    expect(
      rawCustomDataSearchTexts({ name: "Beatles", count: 4, active: true, tags: ["rock", "pop"] })
    ).toEqual(["Beatles", "4", "true", "rock, pop"])
  })
})

describe("customFieldSearchHits", () => {
  it("skips blob fields and empty values", () => {
    const pin = minimalPin({
      custom_data: {
        artist: "Beatles",
        genre: "jazz",
        track: { ref: 1 },
      },
    })
    const hits = customFieldSearchHits(pin, [musicType])
    expect(hits.map((h) => h.field.key)).toEqual(["artist", "genre"])
    expect(hits.find((h) => h.field.key === "genre")?.text).toBe("Jazz")
  })

  it("includes list field values", () => {
    const listType: CustomPinType = {
      ...musicType,
      schema: { fields: [{ key: "tags", label: "Tags", type: "list" }] },
    }
    const pin = minimalPin({ custom_data: { tags: ["jazz", "live"] } })
    const hits = customFieldSearchHits(pin, [listType])
    expect(hits).toEqual([{ field: listType.schema.fields[0], text: "jazz, live" }])
  })
})

describe("pinCustomFieldsMatchQuery", () => {
  it("matches schema-aware select labels with catalog", () => {
    const pin = minimalPin({ custom_data: { genre: "jazz" } })
    expect(pinCustomFieldsMatchQuery(pin, "jazz", [musicType])).toBe(true)
  })

  it("matches raw custom_data without catalog", () => {
    const pin = minimalPin({
      pin_type: "other",
      custom_data: { note: "hidden patio" },
    })
    expect(pinCustomFieldsMatchQuery(pin, "patio")).toBe(true)
  })
})
