import { describe, expect, it } from "vitest"
import {
  DESKTOP_PIN_PANEL_INSET_PX,
  DESKTOP_PIN_PANEL_MAX_WIDTH_PX,
  desktopPinPanelMapPaddingRight,
} from "./siteLayout"

const obscured = DESKTOP_PIN_PANEL_MAX_WIDTH_PX + DESKTOP_PIN_PANEL_INSET_PX

describe("desktopPinPanelMapPaddingRight", () => {
  it("returns 0 when the panel is closed", () => {
    expect(desktopPinPanelMapPaddingRight(1200, false)).toBe(0)
  })

  it("returns panel width plus inset on a wide desktop viewport", () => {
    expect(desktopPinPanelMapPaddingRight(1200, true)).toBe(obscured)
  })

  it("caps at viewport width when narrower than the panel max", () => {
    expect(desktopPinPanelMapPaddingRight(320, true)).toBe(320)
  })

  it("falls back to panel+inset for non-finite or non-positive viewport", () => {
    expect(desktopPinPanelMapPaddingRight(0, true)).toBe(obscured)
    expect(desktopPinPanelMapPaddingRight(-10, true)).toBe(obscured)
    expect(desktopPinPanelMapPaddingRight(Number.NaN, true)).toBe(obscured)
  })
})
