import { describe, expect, it } from "vitest"
import {
  PIN_MARKER_HEIGHT_PX,
  PIN_MARKER_WIDTH_PX,
  choosePinHoverPopupAnchor,
  pinHoverPopupOffset,
  pinHoverPopupPadding,
} from "./pinHoverPopupPosition"

describe("choosePinHoverPopupAnchor", () => {
  const map = { mapWidth: 900, mapHeight: 600, popupWidth: 240, popupHeight: 160 }

  it("defaults to left when the pin is in the open center", () => {
    expect(choosePinHoverPopupAnchor({ x: 450, y: 300, ...map })).toBe("left")
  })

  it("prefers top-left near the top edge when left would clip vertically", () => {
    expect(choosePinHoverPopupAnchor({ x: 450, y: 40, ...map })).toBe("top-left")
  })

  it("prefers bottom-left near the bottom edge when left would clip vertically", () => {
    expect(choosePinHoverPopupAnchor({ x: 450, y: 560, ...map })).toBe("bottom-left")
  })

  it("flips to right when a wide left-anchored popup would clip the right edge", () => {
    // Left-anchored 300px popup at x=650 extends past the map (650+28+300 > 892).
    expect(
      choosePinHoverPopupAnchor({
        x: 650,
        y: 300,
        mapWidth: 900,
        mapHeight: 600,
        popupWidth: 300,
        popupHeight: 120,
      }),
    ).toBe("right")
  })

  it("keeps left when the full popup width still fits to the right", () => {
    expect(
      choosePinHoverPopupAnchor({
        x: 500,
        y: 300,
        mapWidth: 900,
        mapHeight: 600,
        popupWidth: 300,
        popupHeight: 120,
      }),
    ).toBe("left")
  })

  it("combines vertical and horizontal constraints near corners", () => {
    expect(choosePinHoverPopupAnchor({ x: 40, y: 560, ...map })).toBe("bottom-left")
    expect(choosePinHoverPopupAnchor({ x: 860, y: 40, ...map })).toBe("top-right")
  })

  it("treats the pin panel as right-edge padding", () => {
    const padding = pinHoverPopupPadding(448)
    expect(
      choosePinHoverPopupAnchor({ x: 500, y: 300, ...map, padding }),
    ).toBe("right")
  })
})

describe("pinHoverPopupPadding", () => {
  it("adds the panel width to the right inset", () => {
    expect(pinHoverPopupPadding(0).right).toBe(8)
    expect(pinHoverPopupPadding(448).right).toBe(456)
  })
})

describe("pinHoverPopupOffset", () => {
  it("lifts bottom anchors above the pin marker", () => {
    const expectedY = -(PIN_MARKER_HEIGHT_PX + 8)
    expect(pinHoverPopupOffset.bottom).toEqual([0, expectedY])
    expect(pinHoverPopupOffset["bottom-left"][1]).toBe(expectedY)
    expect(pinHoverPopupOffset["bottom-right"][1]).toBe(expectedY)
  })

  it("shifts left/right anchors clear of the pin marker", () => {
    const expectedX = PIN_MARKER_WIDTH_PX / 2 + 8
    expect(pinHoverPopupOffset.left).toEqual([expectedX, 0])
    expect(pinHoverPopupOffset.right).toEqual([-expectedX, 0])
    expect(pinHoverPopupOffset["top-left"][0]).toBe(expectedX)
    expect(pinHoverPopupOffset["bottom-right"][0]).toBe(-expectedX)
  })
})
