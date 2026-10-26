import { describe, expect, it, vi } from "vitest"

vi.mock("../context/PinTypesContext", () => ({
  usePinTypes: () => ({ catalog: [], selectableTypes: [] }),
}))
import PinTypeIcon from "../components/PinTypeIcon"
import {
  AWAITING_PIN_OUTLINE_STROKE,
  createPinTypeMarkerElement,
  createPinTypeMarkerSVG,
  layerFillOpacity,
  NEW_PIN_OUTLINE_STROKE,
  PIN_ICON_DEFS,
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

describe("createPinTypeMarkerSVG", () => {
  it("returns a base64 svg data URL", () => {
    const dataUrl = createPinTypeMarkerSVG("one_time", [])
    const svg = decodeDataUrlBase64(dataUrl)

    expect(svg).toContain("<svg")
    expect(svg).toContain("</svg>")
    expect(svg).toContain("<path")
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

  it("bakes opaque dark-theme primary stroke for selected outline", () => {
    const dataUrl = createPinTypeMarkerSVG("scheduled", [], "selected")
    const svg = decodeDataUrlBase64(dataUrl)
    expect(svg).toContain(`stroke="${SELECTED_PIN_OUTLINE_STROKE}"`)
    expect(svg).toContain(`fill="${SELECTED_PIN_OUTLINE_STROKE}"`)
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
  })

  it.runIf(typeof document !== "undefined")("renders pending marker with outline path", () => {
    const el = createPinTypeMarkerElement("scheduled", [], true)
    const svg = el.querySelector("svg")
    expect(svg).not.toBeNull()
    // Outline path uses stroke-width=10 (teardrop outline for pending state)
    expect(svg!.querySelector('path[stroke-width="10"]')).not.toBeNull()
    expect(svg!.querySelector('path[stroke="currentColor"]')).not.toBeNull()
  })
})

