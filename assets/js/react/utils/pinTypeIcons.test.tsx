import { describe, expect, it, vi } from "vitest"

vi.mock("../context/PinTypesContext", () => ({
  usePinTypes: () => ({ catalog: [], selectableTypes: [] }),
}))
import PinTypeIcon from "../components/PinTypeIcon"
import {
  AWAITING_PIN_OUTLINE_STROKE,
  createPinTypeMarkerElement,
  createPinTypeMarkerSVG,
  getPinTypeMarkerImageId,
  layerFillOpacity,
  NEW_PIN_OUTLINE_STROKE,
  PIN_ICON_DEFS,
  PIN_MARKER_HEIGHT_PX,
  PIN_MARKER_WIDTH_PX,
  SELECTED_PIN_OUTLINE_STROKE,
} from "./pinTypeIcons"

function hasDangerouslySetInnerHTML(node: unknown): boolean {
  if (node == null) return false
  if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") return false

  // React element
  if (typeof node === "object" && "props" in (node as any)) {
    const props = (node as any).props as any
    if (props && props.dangerouslySetInnerHTML != null) return true
    return hasDangerouslySetInnerHTML(props?.children)
  }

  if (Array.isArray(node)) return node.some(hasDangerouslySetInnerHTML)
  return false
}

function decodeDataUrlBase64(dataUrl: string): string {
  const prefix = "data:image/svg+xml;base64,"
  if (!dataUrl.startsWith(prefix)) {
    throw new Error(`Unexpected data URL: ${dataUrl.slice(0, 40)}…`)
  }
  // SVG output is ASCII; atob is sufficient and avoids Node-only `Buffer` types.
  return globalThis.atob(dataUrl.slice(prefix.length))
}

describe("PinTypeIcon", () => {
  it("does not use dangerouslySetInnerHTML", () => {
    const el = PinTypeIcon({ pinType: "scheduled", size: 24 })
    expect(hasDangerouslySetInnerHTML(el)).toBe(false)
  })
})

describe("plant icon layers", () => {
  it("keeps grapes light and ink layers for recoloring", () => {
    const layers = PIN_ICON_DEFS.grapes.layers.map((layer) => layer.name)
    expect(layers).toContain("light")
    expect(layers).toContain("ink")
    expect(PIN_ICON_DEFS.grapes.style).toBe("fill")
  })

  it("maps artist gray inks to visible currentColor opacities", () => {
    expect(layerFillOpacity(0)).toBe(1)
    expect(layerFillOpacity(107)).toBe(0.72)
    expect(layerFillOpacity(215)).toBe(0.28)
  })
})

describe("getPinTypeMarkerImageId", () => {
  it("includes resolved glyph and marker color", () => {
    expect(getPinTypeMarkerImageId("scheduled", [])).toBe("pin-icon-scheduled-calendar-3b82f6")
  })

  it("changes when the catalog icon or color changes", () => {
    const catalog = [
      {
        id: 1,
        slug: "scheduled",
        label: "Scheduled",
        marker_color: "#166534",
        icon: "grapes",
        schema: { fields: [] },
        pin_type: "scheduled",
        enabled: true,
      },
    ]
    expect(getPinTypeMarkerImageId("scheduled", catalog)).toBe(
      "pin-icon-scheduled-grapes-166534",
    )
    expect(getPinTypeMarkerImageId("scheduled", catalog, "new")).toBe(
      "pin-icon-scheduled-grapes-166534-new",
    )
    expect(getPinTypeMarkerImageId("scheduled", catalog)).not.toBe(
      getPinTypeMarkerImageId("scheduled", []),
    )
  })
})

describe("createPinTypeMarkerSVG", () => {
  it("returns a base64 svg data URL", () => {
    const dataUrl = createPinTypeMarkerSVG("one_time", [])
    const svg = decodeDataUrlBase64(dataUrl)

    expect(svg).toContain("<svg")
    expect(svg).toContain("</svg>")
    expect(svg).toContain("<path")
    expect(svg).toContain(`width="${PIN_MARKER_WIDTH_PX}"`)
    expect(svg).toContain(`height="${PIN_MARKER_HEIGHT_PX}"`)
    expect(svg).not.toContain("M20 0 C28 0 35 7")
    expect(svg).toContain("<circle")
    expect(svg).toContain('fill="#000000"')
    expect(svg).not.toContain("feDropShadow")
    expect(svg).not.toContain('stroke="#111827"')
  })

  it("sits light marker colors on a flat black disc", () => {
    const dataUrl = createPinTypeMarkerSVG("pale", [
      {
        id: 1,
        slug: "pale",
        label: "Pale",
        description: "Pale",
        marker_color: "#fef08a",
        icon: "star",
        schema: { fields: [] },
        pin_type: "pale",
        enabled: true,
        inserted_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      } as any,
    ])

    const svg = decodeDataUrlBase64(dataUrl)
    expect(svg).toContain('fill="#000000"')
    expect(svg).toContain('fill="#fef08a"')
    expect(svg).not.toContain("feDropShadow")
  })

  it("renders plant icons with separate gray-layer opacities", () => {
    const dataUrl = createPinTypeMarkerSVG("vine", [
      {
        id: 1,
        slug: "vine",
        label: "Vine",
        description: "Vine",
        marker_color: "#166534",
        icon: "grapes",
        schema: { fields: [] },
        pin_type: "vine",
        enabled: true,
        inserted_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      } as any,
    ])

    const svg = decodeDataUrlBase64(dataUrl)
    expect(svg).toContain('fill-opacity="0.28"')
    expect(svg).toContain('fill-opacity="1"')
  })

  it("renders custom pin types with the builtin other icon (no injected markup)", () => {
    const dataUrl = createPinTypeMarkerSVG("example", [
      {
        id: 1,
        slug: "example",
        label: "Example",
        description: "Example",
        marker_color: "#112233",
        icon: null,
        schema: { fields: [] },
        pin_type: "example",
        enabled: true,
        inserted_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      } as any,
    ])

    const svg = decodeDataUrlBase64(dataUrl)
    expect(svg).toContain('fill="#112233"')
    expect(svg).not.toContain("<script")
    expect(svg).not.toContain("onload=")
  })

  it("bakes amber stroke for new-since-last-visit outline", () => {
    const dataUrl = createPinTypeMarkerSVG("scheduled", [], "new")
    const svg = decodeDataUrlBase64(dataUrl)
    expect(svg).toContain(`stroke="${NEW_PIN_OUTLINE_STROKE}"`)
    expect(svg).toContain('stroke-width="10"')
  })

  it("bakes dark-theme primary stroke for selected outline", () => {
    const dataUrl = createPinTypeMarkerSVG("scheduled", [], "selected")
    const svg = decodeDataUrlBase64(dataUrl)
    expect(svg).toContain(`stroke="${SELECTED_PIN_OUTLINE_STROKE}"`)
    expect(svg).toContain('fill="#000000"')
    expect(svg).toContain('stroke-width="10"')
  })

  it("bakes dashed sky stroke for awaiting-approval outline", () => {
    const dataUrl = createPinTypeMarkerSVG("scheduled", [], "awaiting")
    const svg = decodeDataUrlBase64(dataUrl)
    expect(svg).toContain(`stroke="${AWAITING_PIN_OUTLINE_STROKE}"`)
    expect(svg).toContain('stroke-dasharray="8 6"')
    expect(svg).toContain('stroke-width="10"')
  })
})

describe("createPinTypeMarkerElement", () => {
  it.runIf(typeof document !== "undefined")("returns a DOM element containing an svg", () => {
    const el = createPinTypeMarkerElement("scheduled", [])
    expect(el.querySelector("svg")).not.toBeNull()
    expect(el.childElementCount).toBe(1)
    expect(el.style.width).toBe(`${PIN_MARKER_WIDTH_PX}px`)
    expect(el.style.height).toBe(`${PIN_MARKER_HEIGHT_PX}px`)
  })

  it.runIf(typeof document !== "undefined")("renders pending marker with disc outline", () => {
    const el = createPinTypeMarkerElement("scheduled", [], true)
    const svg = el.querySelector("svg")
    expect(svg).not.toBeNull()
    expect(svg!.getAttribute("width")).toBe(String(PIN_MARKER_WIDTH_PX))
    expect(svg!.getAttribute("height")).toBe(String(PIN_MARKER_HEIGHT_PX))
    expect(svg!.querySelector('[stroke-width="10"]')).not.toBeNull()
    expect(svg!.querySelector('[stroke="currentColor"]')).not.toBeNull()
  })
})

