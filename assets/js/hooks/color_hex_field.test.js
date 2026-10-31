import { describe, expect, it } from "vitest"
import { normalizeHex } from "./color_hex_field"

describe("normalizeHex", () => {
  it("accepts #RRGGBB", () => {
    expect(normalizeHex("#aabbcc")).toBe("#aabbcc")
    expect(normalizeHex("  #AABBCC  ")).toBe("#AABBCC")
  })

  it("prefixes 6-digit hex without a hash", () => {
    expect(normalizeHex("aabbcc")).toBe("#aabbcc")
    expect(normalizeHex("112233")).toBe("#112233")
  })

  it("rejects incomplete or named colors", () => {
    expect(normalizeHex("")).toBeNull()
    expect(normalizeHex("#abc")).toBeNull()
    expect(normalizeHex("red")).toBeNull()
    expect(normalizeHex("#gg0000")).toBeNull()
  })
})
