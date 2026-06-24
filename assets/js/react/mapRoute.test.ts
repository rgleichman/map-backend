import { describe, expect, it } from "vitest"
import { parseInitialPinIdFromSearch, parseMapPinLink } from "./mapRoute"

const ORIGIN = "https://mapgarden.net"

describe("parseMapPinLink", () => {
  it("parses world map pin URLs", () => {
    expect(parseMapPinLink("https://mapgarden.net/map?pin=89", ORIGIN)).toEqual({
      pinId: 89,
      communityUrl: undefined,
    })
    expect(parseMapPinLink("https://mapgarden.net/?pin=42", ORIGIN)).toEqual({
      pinId: 42,
      communityUrl: undefined,
    })
  })

  it("parses community map pin URLs", () => {
    expect(parseMapPinLink("https://mapgarden.net/m/my-community/map?pin=12", ORIGIN)).toEqual({
      pinId: 12,
      communityUrl: "my-community",
    })
  })

  it("returns null for foreign origins", () => {
    expect(parseMapPinLink("https://evil.com/map?pin=89", ORIGIN)).toBeNull()
  })

  it("returns null for non-map paths", () => {
    expect(parseMapPinLink("https://mapgarden.net/pins?pin=89", ORIGIN)).toBeNull()
  })

  it("returns null when pin param is missing or invalid", () => {
    expect(parseMapPinLink("https://mapgarden.net/map", ORIGIN)).toBeNull()
    expect(parseMapPinLink("https://mapgarden.net/map?pin=abc", ORIGIN)).toBeNull()
  })
})

describe("parseInitialPinIdFromSearch", () => {
  it("parses a valid pin id", () => {
    expect(parseInitialPinIdFromSearch("?pin=42")).toBe(42)
  })

  it("returns null when pin is missing or invalid", () => {
    expect(parseInitialPinIdFromSearch("")).toBeNull()
    expect(parseInitialPinIdFromSearch("?pin=abc")).toBeNull()
  })
})
