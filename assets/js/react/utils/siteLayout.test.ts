import { describe, expect, it } from "vitest"
import {
  DESKTOP_PIN_PANEL_MAX_WIDTH_PX,
  desktopPinPanelMapPaddingRight,
} from "./siteLayout"

describe("desktopPinPanelMapPaddingRight", () => {
  it("returns 0 when the panel is closed", () => {
    expect(desktopPinPanelMapPaddingRight(1200, false)).toBe(0)
  })

  it("returns max panel width on a wide desktop viewport", () => {
    expect(desktopPinPanelMapPaddingRight(1200, true)).toBe(DESKTOP_PIN_PANEL_MAX_WIDTH_PX)
  })

  it("caps at viewport width when narrower than the panel max", () => {
    expect(desktopPinPanelMapPaddingRight(320, true)).toBe(320)
  })

  it("falls back to max width for non-finite or non-positive viewport", () => {
    expect(desktopPinPanelMapPaddingRight(0, true)).toBe(DESKTOP_PIN_PANEL_MAX_WIDTH_PX)
    expect(desktopPinPanelMapPaddingRight(-10, true)).toBe(DESKTOP_PIN_PANEL_MAX_WIDTH_PX)
    expect(desktopPinPanelMapPaddingRight(Number.NaN, true)).toBe(DESKTOP_PIN_PANEL_MAX_WIDTH_PX)
  })
})
