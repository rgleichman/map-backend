import { describe, expect, it } from "vitest"
import type { SubMap } from "../types"
import { canChooseWorldVisibility } from "./subMapForm"

function minimalSubMap(overrides: Partial<SubMap>): SubMap {
  return {
    community_url: "test",
    name: "Test",
    contribution_mode: "open",
    promote_to_world_default: "ask",
    visibility: "public",
    settings: {},
    ...overrides,
  }
}

describe("canChooseWorldVisibility", () => {
  it("returns false when subMap is null", () => {
    expect(canChooseWorldVisibility(null)).toBe(false)
  })

  it("returns false when promote_to_world_default is not ask", () => {
    expect(canChooseWorldVisibility(minimalSubMap({ promote_to_world_default: "never" }))).toBe(false)
    expect(canChooseWorldVisibility(minimalSubMap({ promote_to_world_default: "always" }))).toBe(false)
  })

  it("returns true for ask when user can post", () => {
    expect(canChooseWorldVisibility(minimalSubMap({ can_post: true }))).toBe(true)
  })

  it("returns true for ask when user can moderate", () => {
    expect(canChooseWorldVisibility(minimalSubMap({ can_moderate: true }))).toBe(true)
  })

  it("returns false for ask when user cannot post or moderate", () => {
    expect(canChooseWorldVisibility(minimalSubMap({ can_post: false, can_moderate: false }))).toBe(false)
  })
})
