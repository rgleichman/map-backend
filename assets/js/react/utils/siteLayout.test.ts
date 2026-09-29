import { describe, expect, it } from "vitest"
import {
  DESKTOP_MAP_RIGHT_RESERVE_PX,
  desktopMapPadding,
  desktopMapPaddingRight,
} from "./siteLayout"

describe("desktopMapPaddingRight", () => {
  it("returns the rail reserve on a wide desktop viewport", () => {
    expect(desktopMapPaddingRight(1200)).toBe(DESKTOP_MAP_RIGHT_RESERVE_PX)
  })

  it("caps at viewport width when narrower than the reserve", () => {
    expect(desktopMapPaddingRight(320)).toBe(320)
  })

  it("falls back to the reserve for non-finite or non-positive viewport", () => {
    expect(desktopMapPaddingRight(0)).toBe(DESKTOP_MAP_RIGHT_RESERVE_PX)
    expect(desktopMapPaddingRight(-10)).toBe(DESKTOP_MAP_RIGHT_RESERVE_PX)
    expect(desktopMapPaddingRight(Number.NaN)).toBe(DESKTOP_MAP_RIGHT_RESERVE_PX)
  })
})

describe("desktopMapPadding", () => {
  it("returns zero padding on mobile", () => {
    expect(desktopMapPadding(1200, false)).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    })
  })

  it("returns the right reserve on desktop", () => {
    expect(desktopMapPadding(1200, true)).toEqual({
      top: 0,
      right: DESKTOP_MAP_RIGHT_RESERVE_PX,
      bottom: 0,
      left: 0,
    })
  })
})
