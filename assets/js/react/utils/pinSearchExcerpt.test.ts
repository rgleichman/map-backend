import { describe, expect, it } from "vitest"
import type { CustomPinType, Pin } from "../types"
import {
  normalizeDescriptionForExcerpt,
  pinSearchExcerpt,
  titleMatchesQuery,
} from "./pinSearchExcerpt"

const musicType: CustomPinType = {
  id: 1,
  slug: "music",
  label: "Music",
  pin_type: "custom:music",
  enabled: true,
  schema: {
    fields: [{ key: "artist", label: "Artist", type: "text" }],
  },
}

function minimalPin(overrides: Partial<Pin>): Pin {
  return {
    id: 1,
    title: "Coffee Shop",
    latitude: 0,
    longitude: 0,
    pin_type: "other",
    tags: [],
    ...overrides,
  }
}

describe("titleMatchesQuery", () => {
  it("matches case-insensitively", () => {
    const pin = minimalPin({ title: "Joe's Pizza" })
    expect(titleMatchesQuery(pin, "pizza")).toBe(true)
    expect(titleMatchesQuery(pin, "JOE")).toBe(true)
    expect(titleMatchesQuery(pin, "burger")).toBe(false)
  })
})

describe("pinSearchExcerpt", () => {
  it("returns null when query is empty", () => {
    const pin = minimalPin({ description: "hello world" })
    expect(pinSearchExcerpt(pin, "")).toBeNull()
    expect(pinSearchExcerpt(pin, "   ")).toBeNull()
  })

  it("returns null when title matches", () => {
    const pin = minimalPin({
      title: "Taco Stand",
      description: "Best tacos in town",
      tags: ["mexican"],
    })
    expect(pinSearchExcerpt(pin, "taco")).toBeNull()
  })

  it("returns tag excerpt with preserved case", () => {
    const pin = minimalPin({
      title: "Downtown",
      tags: ["MexiCan-food"],
    })
    const excerpt = pinSearchExcerpt(pin, "can")
    expect(excerpt).toEqual({
      source: "tag",
      before: "Mexi",
      match: "Can",
      after: "-food",
    })
  })

  it("prefers tag over custom field and description when both match", () => {
    const pin = minimalPin({
      title: "Place",
      tags: ["brunch"],
      pin_type: "custom:music",
      custom_data: { artist: "brunch band" },
      description: "Great brunch spot on weekends",
    })
    const excerpt = pinSearchExcerpt(pin, "brunch", [musicType])
    expect(excerpt?.source).toBe("tag")
    expect(excerpt?.match).toBe("brunch")
  })

  it("returns custom field excerpt with label prefix", () => {
    const pin = minimalPin({
      title: "Gig",
      pin_type: "custom:music",
      custom_data: { artist: "The Beatles" },
    })
    const excerpt = pinSearchExcerpt(pin, "beatles", [musicType])
    expect(excerpt?.source).toBe("custom_field")
    expect(excerpt?.before).toBe("Artist: The ")
    expect(excerpt?.match).toBe("Beatles")
    expect(excerpt?.after).toBe("")
  })

  it("returns description excerpt when only description matches", () => {
    const pin = minimalPin({
      title: "Cafe",
      description: "Known for amazing pastries and coffee",
    })
    const excerpt = pinSearchExcerpt(pin, "pastries")
    expect(excerpt?.source).toBe("description")
    expect(excerpt?.match).toBe("pastries")
    expect(excerpt?.before + excerpt!.match + excerpt?.after).toContain("pastries")
  })

  it("adds ellipsis for long descriptions", () => {
    const longPrefix = "word ".repeat(30)
    const pin = minimalPin({
      title: "Spot",
      description: `${longPrefix}unique keyword here`,
    })
    const excerpt = pinSearchExcerpt(pin, "unique")
    expect(excerpt?.before.startsWith("…")).toBe(true)
    expect(excerpt?.match).toBe("unique")
  })
})

describe("normalizeDescriptionForExcerpt", () => {
  it("collapses whitespace and strips simple markdown", () => {
    const raw = "# Hello\n\nVisit [our site](https://example.com) for *details*"
    expect(normalizeDescriptionForExcerpt(raw)).toBe("Hello Visit our site for details")
  })
})
