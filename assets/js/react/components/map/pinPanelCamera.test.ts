import { describe, expect, it } from "vitest"
import {
  PIN_PANEL_EDGE_MARGIN_PX,
  pointInPaddedViewport,
  targetScreenPointInPaddedViewport,
} from "./pinPanelCamera"

const padding = { top: 0, right: 448, bottom: 0, left: 0 }
const margin = PIN_PANEL_EDGE_MARGIN_PX
const mapWidth = 1200
const mapHeight = 800

describe("pointInPaddedViewport", () => {
  it("accepts a point in the visible left region", () => {
    expect(pointInPaddedViewport(400, 300, mapWidth, mapHeight, padding, margin)).toBe(true)
  })

  it("rejects a point under the right panel band", () => {
    expect(pointInPaddedViewport(1000, 300, mapWidth, mapHeight, padding, margin)).toBe(false)
  })

  it("rejects a point inside the margin from the left edge", () => {
    expect(pointInPaddedViewport(20, 300, mapWidth, mapHeight, padding, margin)).toBe(false)
  })

  it("rejects a point below the bottom margin", () => {
    expect(pointInPaddedViewport(400, 790, mapWidth, mapHeight, padding, margin)).toBe(false)
  })
})

describe("targetScreenPointInPaddedViewport", () => {
  const maxX = mapWidth - padding.right - margin
  const maxY = mapHeight - padding.bottom - margin
  const minX = margin
  const minY = margin

  it("returns null when the point is already visible", () => {
    expect(
      targetScreenPointInPaddedViewport(400, 300, mapWidth, mapHeight, padding, margin),
    ).toBeNull()
  })

  it("clamps to the right margin edge when under the panel", () => {
    expect(
      targetScreenPointInPaddedViewport(1000, 300, mapWidth, mapHeight, padding, margin),
    ).toEqual({ x: maxX, y: 300 })
  })

  it("clamps to the left margin when past the left edge", () => {
    expect(
      targetScreenPointInPaddedViewport(20, 400, mapWidth, mapHeight, padding, margin),
    ).toEqual({ x: minX, y: 400 })
  })

  it("clamps vertically when past the top margin", () => {
    expect(
      targetScreenPointInPaddedViewport(400, 10, mapWidth, mapHeight, padding, margin),
    ).toEqual({ x: 400, y: minY })
  })

  it("clamps both axes for a lower-left pin (horizontal and vertical)", () => {
    // Zoomed-out lower-left: past left margin and near/below the bottom.
    const target = targetScreenPointInPaddedViewport(
      10,
      maxY + 40,
      mapWidth,
      mapHeight,
      padding,
      margin,
    )
    expect(target).toEqual({ x: minX, y: maxY })
  })

  it("keeps y when only x is out, and x when only y is out", () => {
    expect(
      targetScreenPointInPaddedViewport(10, 400, mapWidth, mapHeight, padding, margin),
    ).toEqual({ x: minX, y: 400 })
    expect(
      targetScreenPointInPaddedViewport(400, maxY + 30, mapWidth, mapHeight, padding, margin),
    ).toEqual({ x: 400, y: maxY })
  })
})

/**
 * Documents the contract for sphere placement: given a projected pin and a
 * clamped target, MapLibre globe `easeTo({ center: pin, offset, zoom })` must
 * put the pin on that screen point at a locked zoom (including lat when the
 * target moves vertically). Planar `unproject(center + Δ)` is insufficient.
 */
describe("sphere placement target contract", () => {
  it("requests a vertical screen target when a lower-left pin is below the window", () => {
    const maxY = mapHeight - padding.bottom - margin
    const projected = { x: 10, y: maxY + 80 }
    const target = targetScreenPointInPaddedViewport(
      projected.x,
      projected.y,
      mapWidth,
      mapHeight,
      padding,
      margin,
    )
    expect(target).not.toBeNull()
    // Must ask for both horizontal and vertical correction — globe easeTo
    // with offset then rotates the sphere in lng and lat at locked zoom.
    expect(target!.x).toBe(margin)
    expect(target!.y).toBe(maxY)
    expect(target!.y).toBeLessThan(projected.y)
  })
})
