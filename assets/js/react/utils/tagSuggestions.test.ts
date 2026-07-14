import { describe, expect, it } from "vitest"
import type { Pin } from "../types"
import {
  deriveMapTags,
  isCommunityTag,
  searchTagSuggestions,
} from "./tagSuggestions"

const pin = (tags: string[]): Pin => ({
  id: 1,
  title: "t",
  latitude: 0,
  longitude: 0,
  pin_type: "other",
  status: "approved",
  tags,
})

describe("deriveMapTags", () => {
  it("dedupes and sorts tags", () => {
    expect(
      deriveMapTags([
        pin(["zebra", "apple"]),
        pin(["apple", "mango"]),
        pin([]),
      ]),
    ).toEqual(["apple", "mango", "zebra"])
  })
})

describe("isCommunityTag", () => {
  it("detects community: prefix", () => {
    expect(isCommunityTag("community:foo")).toBe(true)
    expect(isCommunityTag("food")).toBe(false)
  })
})

describe("searchTagSuggestions", () => {
  const tags = ["apple", "apricot", "banana", "community:acme", "mango"]

  it("filters by case-insensitive substring", () => {
    expect(searchTagSuggestions(tags, "AP")).toEqual(["apple", "apricot"])
  })

  it("returns first N tags when query is blank", () => {
    expect(searchTagSuggestions(tags, "  ", { limit: 3 })).toEqual([
      "apple",
      "apricot",
      "banana",
    ])
  })

  it("omits community tags when requested", () => {
    expect(
      searchTagSuggestions(tags, "a", { omitCommunityTags: true }),
    ).toEqual(["apple", "apricot", "banana", "mango"])
  })

  it("excludes tags already selected (case-insensitive)", () => {
    expect(
      searchTagSuggestions(tags, "a", { exclude: ["Apple", "BANANA"] }),
    ).toEqual(["apricot", "community:acme", "mango"])
  })

  it("respects limit", () => {
    expect(searchTagSuggestions(tags, "", { limit: 2 })).toEqual(["apple", "apricot"])
  })
})
