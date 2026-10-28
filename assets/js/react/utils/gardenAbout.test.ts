import { describe, expect, it } from "vitest"
import type { SubMap } from "../types"
import {
  gardenAboutToolbarEntry,
  gardenDescriptionText,
  gardenRulesText,
  hasGardenAboutContent,
  hasGardenRules,
  presentGardenText,
  shouldShowGardenRulesCallout,
} from "./gardenAbout"

function minimalSubMap(overrides: Partial<SubMap> = {}): SubMap {
  return {
    community_url: "test",
    name: "Test garden",
    color: "#6366f1",
    contribution_mode: "open",
    promote_to_world_default: "ask",
    visibility: "public",
    settings: {},
    ...overrides,
  }
}

describe("presentGardenText", () => {
  it("returns null for missing or whitespace-only values", () => {
    expect(presentGardenText(null)).toBeNull()
    expect(presentGardenText(undefined)).toBeNull()
    expect(presentGardenText("")).toBeNull()
    expect(presentGardenText("   \n\t")).toBeNull()
  })

  it("trims ends but keeps inner newlines", () => {
    expect(presentGardenText("  Be kind.\nNo spam.  ")).toBe("Be kind.\nNo spam.")
  })
})

describe("garden about content", () => {
  it("treats rules and description independently", () => {
    expect(hasGardenAboutContent(null)).toBe(false)
    expect(hasGardenAboutContent(minimalSubMap())).toBe(false)
    expect(hasGardenAboutContent(minimalSubMap({ rules: "   " }))).toBe(false)
    expect(hasGardenAboutContent(minimalSubMap({ description: "A quiet plot" }))).toBe(true)
    expect(hasGardenAboutContent(minimalSubMap({ rules: "No cars" }))).toBe(true)
    expect(hasGardenRules(minimalSubMap({ description: "A quiet plot" }))).toBe(false)
    expect(hasGardenRules(minimalSubMap({ rules: "No cars" }))).toBe(true)
    expect(gardenDescriptionText(minimalSubMap({ description: "  hi  " }))).toBe("hi")
    expect(gardenRulesText(minimalSubMap({ rules: "  No cars  " }))).toBe("No cars")
  })
})

describe("shouldShowGardenRulesCallout", () => {
  it("shows when the garden has rules, including while editing", () => {
    const withRules = minimalSubMap({ rules: "Stay on paths" })
    expect(shouldShowGardenRulesCallout(withRules)).toBe(true)
    expect(shouldShowGardenRulesCallout(minimalSubMap())).toBe(false)
    expect(shouldShowGardenRulesCallout(null)).toBe(false)
  })
})

describe("gardenAboutToolbarEntry", () => {
  it("hides when there is no about content", () => {
    expect(gardenAboutToolbarEntry(minimalSubMap(), false)).toBe("hidden")
    expect(gardenAboutToolbarEntry(minimalSubMap(), true)).toBe("hidden")
    expect(gardenAboutToolbarEntry(minimalSubMap({ rules: "  " }), false)).toBe("hidden")
  })

  it("uses the chip for visitors and the menu when other actions exist", () => {
    const withAbout = minimalSubMap({ description: "A community plot" })
    expect(gardenAboutToolbarEntry(withAbout, false)).toBe("chip")
    expect(gardenAboutToolbarEntry(withAbout, true)).toBe("menu")
    expect(gardenAboutToolbarEntry(minimalSubMap({ rules: "No cars" }), true)).toBe("menu")
  })
})
