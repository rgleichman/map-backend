import { describe, expect, it } from "vitest"
import {
  PIN_PANEL_EDGE_MARGIN_PX,
  pointInPaddedViewport,
  zoomToKeepPointInPaddedViewport,
} from "./pinPanelCamera"

const padding = { top: 0, right: 448, bottom: 0, left: 0 }
const margin = PIN_PANEL_EDGE_MARGIN_PX

describe("pointInPaddedViewport", () => {
  it("accepts a point in the visible left region", () => {
    expect(pointInPaddedViewport(400, 300, 1200, 800, padding, margin)).toBe(true)
  })

  it("rejects a point under the right panel band", () => {
    expect(pointInPaddedViewport(1000, 300, 1200, 800, padding, margin)).toBe(false)
  })

  it("rejects a point inside the margin from the left edge", () => {
    expect(pointInPaddedViewport(20, 300, 1200, 800, padding, margin)).toBe(false)
  })
})

describe("zoomToKeepPointInPaddedViewport", () => {
  /** Simulated globe-ish projector: point drifts toward padded visual center as zoom drops. */
  function projectTowardCenter(atZoom10: { x: number; y: number }) {
    const cx = (1200 - 448) / 2
    const cy = 400
    return (zoom: number) => {
      // Non-Mercator curve (not 2^Δz) so the search must rely on projectAtZoom.
      const t = Math.max(0, Math.min(1, (10 - zoom) / 10))
      const ease = t * t
      return {
        x: atZoom10.x + (cx - atZoom10.x) * ease,
        y: atZoom10.y + (cy - atZoom10.y) * ease,
      }
    }
  }

  it("keeps current zoom when the point is already visible", () => {
    expect(
      zoomToKeepPointInPaddedViewport({
        mapWidth: 1200,
        mapHeight: 800,
        padding,
        margin,
        currentZoom: 10,
        minZoom: 0,
        projectAtZoom: () => ({ x: 400, y: 400 }),
      }),
    ).toBe(10)
  })

  it("zooms out until projectAtZoom reports the point in view", () => {
    const zoom = zoomToKeepPointInPaddedViewport({
      mapWidth: 1200,
      mapHeight: 800,
      padding,
      margin,
      currentZoom: 10,
      minZoom: 0,
      projectAtZoom: projectTowardCenter({ x: -200, y: 400 }),
    })
    expect(zoom).toBeLessThan(10)
    expect(zoom).toBeGreaterThanOrEqual(0)
    const { x, y } = projectTowardCenter({ x: -200, y: 400 })(zoom)
    expect(pointInPaddedViewport(x, y, 1200, 800, padding, margin)).toBe(true)
  })

  it("does not zoom in past currentZoom", () => {
    const zoom = zoomToKeepPointInPaddedViewport({
      mapWidth: 1200,
      mapHeight: 800,
      padding,
      margin,
      currentZoom: 8,
      minZoom: 0,
      projectAtZoom: () => ({ x: 400, y: 400 }),
    })
    expect(zoom).toBe(8)
  })

  it("keeps current zoom when the point never enters the viewport", () => {
    const zoom = zoomToKeepPointInPaddedViewport({
      mapWidth: 1200,
      mapHeight: 800,
      padding,
      margin,
      currentZoom: 12,
      minZoom: 3,
      projectAtZoom: () => ({ x: -1_000_000, y: 400 }),
    })
    expect(zoom).toBe(12)
  })
})
