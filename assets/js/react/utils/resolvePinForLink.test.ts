import { describe, expect, it } from "vitest"
import { parsePinIdFromMapUrlInput } from "./resolvePinForLink"

const ORIGIN = "https://mapgarden.net"

describe("parsePinIdFromMapUrlInput", () => {
  it("extracts pin id from map URLs", () => {
    expect(parsePinIdFromMapUrlInput("https://mapgarden.net/map?pin=89", ORIGIN)).toBe(89)
    expect(parsePinIdFromMapUrlInput("/map?pin=42", ORIGIN)).toBe(42)
    expect(parsePinIdFromMapUrlInput("https://mapgarden.net/m/austin/map?pin=12", ORIGIN)).toBe(12)
  })

  it("returns null for non-map URLs", () => {
    expect(parsePinIdFromMapUrlInput("https://example.com", ORIGIN)).toBeNull()
    expect(parsePinIdFromMapUrlInput("pizza", ORIGIN)).toBeNull()
    expect(parsePinIdFromMapUrlInput("https://evil.com/map?pin=89", ORIGIN)).toBeNull()
  })
})
