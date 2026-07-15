import { describe, expect, it } from "vitest"
import PinTypeIcon from "../components/PinTypeIcon"
import {
  createPinTypeMarkerElement,
  createPinTypeMarkerSVG,
  NEW_PIN_OUTLINE_STROKE,
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

describe("createPinTypeMarkerSVG", () => {
  it("returns a base64 svg data URL", () => {
    const dataUrl = createPinTypeMarkerSVG("one_time", [])
    const svg = decodeDataUrlBase64(dataUrl)

    expect(svg).toContain("<svg")
    expect(svg).toContain("</svg>")
    expect(svg).toContain("<path")
  })

  it("renders custom pin types with the builtin other icon (no injected markup)", () => {
    const dataUrl = createPinTypeMarkerSVG("custom:example", [
      {
        id: 1,
        slug: "example",
        label: "Example",
        description: "Example",
        marker_color: "#112233",
        icon: null,
        schema: { fields: [] },
        pin_type: "custom:example",
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

