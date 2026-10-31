import pinIconsJson from "../../../shared/pin_icons.json"
import type { CatalogPinType, PinIconName as PinIconNameType, PinType } from "../types"
import {
  DEFAULT_PIN_TYPE_COLORS,
  PIN_TYPE_COLORS,
  type PinTypeColorEntry
} from "./pinTypeColors"
import { findPinType, iconBackgroundColor, markerColor } from "./customPinTypes"

type SvgPathDef = {
  d: string
  fillRule?: "evenodd" | "nonzero"
  clipRule?: "evenodd" | "nonzero"
}

export type PinIconLayer = {
  name: string
  gray: number
  paths: SvgPathDef[]
}

export type PinIconDef = {
  label: string
  style: "fill" | "stroke"
  layers: PinIconLayer[]
}

type PinIconsFile = {
  order: PinIconNameType[]
  icons: Record<PinIconNameType, PinIconDef>
}

const PIN_ICONS_FILE = pinIconsJson as PinIconsFile

/** Glyph names a catalog row may reference through `icon`. */
export const PinIcon = {
  Carrot: "carrot",
  Calendar: "calendar",
  Building: "building",
  Star: "star",
  Pinecone: "pinecone",
  Grapes: "grapes",
  Sprout: "sprout",
  Leaf: "leaf",
  Bud: "bud",
  Cotton: "cotton",
  Daisy: "daisy",
  Sprig: "sprig",
  Berries: "berries",
  Trowel: "trowel",
  Mushrooms: "mushrooms",
  Hop: "hop",
  Dandelion: "dandelion",
  Seed: "seed",
  Toadstools: "toadstools",
  Fiddlehead: "fiddlehead",
} as const satisfies Record<string, PinIconNameType>

export const PIN_ICON_DEFS: Record<PinIconNameType, PinIconDef> = PIN_ICONS_FILE.icons

export const PIN_ICON_ORDER: readonly PinIconNameType[] = PIN_ICONS_FILE.order

export const DEFAULT_PIN_ICON = PinIcon.Star

/** Glyphs for slugs of the seeded system types, used when `icon` is blank. */
const SLUG_ICON_FALLBACKS: Record<string, PinIconNameType> = {
  one_time: PinIcon.Carrot,
  scheduled: PinIcon.Calendar,
  food_bank: PinIcon.Building,
  other: PinIcon.Star,
}

export function isPinIconName(value: string): value is PinIconNameType {
  return value in PIN_ICON_DEFS
}

/**
 * Opacity of `currentColor` for an artist gray ink (0 = black, 255 = paper).
 * Stepped so light fills stay visible when recolored.
 */
export function layerFillOpacity(gray: number): number {
  if (gray <= 20) return 1
  if (gray <= 120) return 0.72
  if (gray <= 185) return 0.48
  return 0.28
}

export type PinTypeConfig = PinTypeColorEntry & {
  /** Which glyph to render for this pin type. */
  iconKey: PinIconNameType
  /** Map disc fill (`icon_background_color`, default black). */
  iconBackgroundColor: string
}

/** Glyph for a catalog row: explicit `icon`, then slug fallback, then default. */
export function pinIconName(
  icon: string | null | undefined,
  slug?: string | null
): PinIconNameType {
  if (icon && isPinIconName(icon)) return icon
  if (icon && icon in SLUG_ICON_FALLBACKS) return SLUG_ICON_FALLBACKS[icon]
  if (slug && slug in SLUG_ICON_FALLBACKS) return SLUG_ICON_FALLBACKS[slug]
  return DEFAULT_PIN_ICON
}

export function isStrokeIcon(iconKey: PinIconNameType): boolean {
  return PIN_ICON_DEFS[iconKey]?.style === "stroke"
}

/** Colors, label, description and glyph for a pin type slug, driven by the catalog. */
export function resolvePinTypeConfig(
  pinType: PinType | null | undefined,
  catalog: CatalogPinType[] = []
): PinTypeConfig {
  const catalogType = findPinType(pinType, catalog)
  const hasPalette = pinType != null && pinType in PIN_TYPE_COLORS
  const palette = hasPalette ? PIN_TYPE_COLORS[pinType as string] : DEFAULT_PIN_TYPE_COLORS
  const color = markerColor(catalogType)
  const colors: PinTypeColorEntry = color
    ? { ...palette, color, backgroundColor: color, borderColor: color }
    : palette

  return {
    ...colors,
    label: catalogType?.label ?? (hasPalette ? palette.label : pinType || palette.label),
    description: catalogType?.description ?? (hasPalette ? palette.description : ""),
    iconKey: pinIconName(catalogType?.icon, pinType),
    iconBackgroundColor: iconBackgroundColor(catalogType),
  }
}

/** On-map pin image size (square canvas; glyph sits on a colored disc). */
export const PIN_MARKER_WIDTH_PX = 50
export const PIN_MARKER_HEIGHT_PX = 50

/** Icon transform: 24×24 viewBox scaled to ~40px, centered on the 50×50 canvas. */
const MARKER_ICON_TRANSFORM = "translate(25,25) scale(1.666) translate(-12,-12)"

/** Extra viewBox room so a 10px disc outline is not clipped at the canvas edge. */
const MARKER_VIEWBOX = "-6 -6 62 62"

const MARKER_BG_CX = 25
const MARKER_BG_CY = 25
const MARKER_BG_R = 22.5

const MARKER_OUTLINE_STROKE_WIDTH = "10"

/**
 * Disc outline styles used when building marker SVGs.
 * - pending: stroke via CSS `currentColor` (DOM placement; see `.pin-marker--pending`)
 * - selected: baked light green (dark-theme primary) for MapLibre selected-pin images
 * - new: baked amber stroke for MapLibre “new since last visit” images
 * - awaiting: baked dashed sky stroke for MapLibre moderation-pending pins
 */
export type PinMarkerOutline = "pending" | "selected" | "new" | "awaiting"

/** MapLibre image ids that use a baked outline variant. */
export type PinMarkerMapOutline = Extract<PinMarkerOutline, "selected" | "new" | "awaiting">

/** Stroke for “new since last visit” disc outline (not `--color-primary`). */
export const NEW_PIN_OUTLINE_STROKE = "#f59e0b"

/**
 * Selected-pin / label outline: dark-theme primary (`oklch(83% 0.14 139.72)` → `#95dd84`).
 * Fixed so selection stays a light green in both light and dark themes.
 */
export const SELECTED_PIN_OUTLINE_STROKE = "#95dd84"

/** Stroke for moderation-pending (awaiting approval) dashed outline. */
export const AWAITING_PIN_OUTLINE_STROKE = "#0ea5e9"

const AWAITING_STROKE_DASHARRAY = "8 6"

function markerImageColorToken(color: string): string {
  return color.replace(/^#/, "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

/**
 * Image id used in MapLibre for pin-type marker icons (for use with map.addImage / icon-image).
 * Includes resolved glyph, icon color, and disc color so catalog edits change the GeoJSON `icon-image`.
 */
export function getPinTypeMarkerImageId(
  pinType: PinType,
  catalog: CatalogPinType[] = [],
  outline?: PinMarkerMapOutline,
): string {
  const config = resolvePinTypeConfig(pinType, catalog)
  const slug = pinType || DEFAULT_PIN_ICON
  const base = `pin-icon-${slug}-${config.iconKey}-${markerImageColorToken(config.color)}-${markerImageColorToken(config.iconBackgroundColor)}`
  if (outline === "selected") return `${base}-selected`
  if (outline === "new") return `${base}-new`
  if (outline === "awaiting") return `${base}-awaiting`
  return base
}

const SVG_NS = "http://www.w3.org/2000/svg"

function pathAttrs(p: SvgPathDef): string[] {
  const attrs: string[] = [`d="${p.d}"`]
  if (p.fillRule) attrs.push(`fill-rule="${p.fillRule}"`)
  if (p.clipRule) attrs.push(`clip-rule="${p.clipRule}"`)
  return attrs
}

function iconLayerMarkup(iconKey: PinIconNameType): string {
  const def = PIN_ICON_DEFS[iconKey]
  if (def.style === "stroke") {
    return def.layers
      .flatMap((layer) => layer.paths)
      .map((p) => `<path ${pathAttrs(p).join(" ")} />`)
      .join("")
  }

  return def.layers
    .map((layer) => {
      const paths = layer.paths
        .map((p) => `<path ${pathAttrs(p).join(" ")} />`)
        .join("")
      return `<g fill-opacity="${layerFillOpacity(layer.gray)}">${paths}</g>`
    })
    .join("")
}

function appendIconGlyph(
  iconGroup: SVGGElement,
  iconKey: PinIconNameType,
  iconFill: string,
): void {
  const def = PIN_ICON_DEFS[iconKey]
  if (def.style === "stroke") {
    iconGroup.setAttribute("fill", "none")
    iconGroup.setAttribute("stroke", iconFill)
    iconGroup.setAttribute("stroke-width", "2")
    iconGroup.setAttribute("stroke-linecap", "round")
    iconGroup.setAttribute("stroke-linejoin", "round")
    iconGroup.setAttribute("color", iconFill)
    for (const p of def.layers.flatMap((layer) => layer.paths)) {
      const path = document.createElementNS(SVG_NS, "path")
      path.setAttribute("d", p.d)
      iconGroup.appendChild(path)
    }
    return
  }

  iconGroup.setAttribute("fill", iconFill)
  for (const layer of def.layers) {
    const layerGroup = document.createElementNS(SVG_NS, "g")
    layerGroup.setAttribute("fill", iconFill)
    layerGroup.setAttribute("fill-opacity", String(layerFillOpacity(layer.gray)))
    for (const p of layer.paths) {
      const path = document.createElementNS(SVG_NS, "path")
      path.setAttribute("d", p.d)
      if (p.fillRule) path.setAttribute("fill-rule", p.fillRule)
      if (p.clipRule) path.setAttribute("clip-rule", p.clipRule)
      layerGroup.appendChild(path)
    }
    iconGroup.appendChild(layerGroup)
  }
}

function markerOutlineStroke(outline: PinMarkerOutline | null): string | null {
  if (outline === "pending") return "currentColor"
  if (outline === "selected") return SELECTED_PIN_OUTLINE_STROKE
  if (outline === "new") return NEW_PIN_OUTLINE_STROKE
  if (outline === "awaiting") return AWAITING_PIN_OUTLINE_STROKE
  return null
}

function markerBackgroundAttrs(
  fill: string,
  stroke: string | null,
  outline: PinMarkerOutline | null,
): string {
  const strokeAttrs =
    stroke != null
      ? ` stroke="${stroke}" stroke-width="${MARKER_OUTLINE_STROKE_WIDTH}"`
      : ""
  const dash =
    outline === "awaiting" ? ` stroke-dasharray="${AWAITING_STROKE_DASHARRAY}"` : ""
  return `cx="${MARKER_BG_CX}" cy="${MARKER_BG_CY}" r="${MARKER_BG_R}" fill="${fill}"${strokeAttrs}${dash}`
}

function appendMarkerBackground(
  svg: SVGSVGElement,
  fill: string,
  stroke: string | null,
  outline: PinMarkerOutline | null,
): void {
  const circle = document.createElementNS(SVG_NS, "circle")
  circle.setAttribute("cx", String(MARKER_BG_CX))
  circle.setAttribute("cy", String(MARKER_BG_CY))
  circle.setAttribute("r", String(MARKER_BG_R))
  circle.setAttribute("fill", fill)
  if (stroke != null) {
    circle.setAttribute("stroke", stroke)
    circle.setAttribute("stroke-width", MARKER_OUTLINE_STROKE_WIDTH)
  }
  if (outline === "awaiting") {
    circle.setAttribute("stroke-dasharray", AWAITING_STROKE_DASHARRAY)
  }
  svg.appendChild(circle)
}

function buildPinMarkerSVGStringFallback(
  pinType: PinType,
  outline: PinMarkerOutline | null,
  catalog: CatalogPinType[] = [],
): string {
  const config = resolvePinTypeConfig(pinType, catalog)
  const iconFill = config.color
  const iconKey = config.iconKey
  const iconGroupAttrs = isStrokeIcon(iconKey)
    ? `fill="none" stroke="${iconFill}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" color="${iconFill}"`
    : `fill="${iconFill}"`

  const stroke = markerOutlineStroke(outline)
  const iconMarkup = iconLayerMarkup(iconKey)

  return `
    <svg width="${PIN_MARKER_WIDTH_PX}" height="${PIN_MARKER_HEIGHT_PX}" viewBox="${MARKER_VIEWBOX}" xmlns="${SVG_NS}">
      <circle ${markerBackgroundAttrs(config.iconBackgroundColor, stroke, outline)}/>
      <g transform="${MARKER_ICON_TRANSFORM}">
        <g ${iconGroupAttrs}>
          ${iconMarkup}
        </g>
      </g>
    </svg>
  `
}

function buildPinMarkerSVGElement(
  pinType: PinType,
  outline: PinMarkerOutline | null,
  catalog: CatalogPinType[] = [],
): SVGSVGElement {
  const config = resolvePinTypeConfig(pinType, catalog)
  const iconFill = config.color
  const iconKey = config.iconKey
  const stroke = markerOutlineStroke(outline)

  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("width", String(PIN_MARKER_WIDTH_PX))
  svg.setAttribute("height", String(PIN_MARKER_HEIGHT_PX))
  svg.setAttribute("viewBox", MARKER_VIEWBOX)
  svg.setAttribute("xmlns", SVG_NS)

  appendMarkerBackground(svg, config.iconBackgroundColor, stroke, outline)

  const rootGroup = document.createElementNS(SVG_NS, "g")
  rootGroup.setAttribute("transform", MARKER_ICON_TRANSFORM)
  svg.appendChild(rootGroup)

  const iconGroup = document.createElementNS(SVG_NS, "g")
  appendIconGlyph(iconGroup, iconKey, iconFill)
  rootGroup.appendChild(iconGroup)
  return svg
}

/**
 * MapLibre marker image (data URL). Pass `outline: "new"` or `"selected"` for outlined variants.
 */
export function createPinTypeMarkerSVG(
  pinType: PinType,
  catalog: CatalogPinType[] = [],
  outline?: PinMarkerMapOutline,
): string {
  const resolved = outline ?? null
  if (typeof document === "undefined" || typeof XMLSerializer === "undefined") {
    const svg = buildPinMarkerSVGStringFallback(pinType, resolved, catalog)
    return `data:image/svg+xml;base64,${btoa(svg)}`
  }

  const svgEl = buildPinMarkerSVGElement(pinType, resolved, catalog)
  const svg = new XMLSerializer().serializeToString(svgEl)
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

/**
 * DOM placement marker (glyph on a black disc). When `pending`, draws a
 * primary-colored disc outline via `currentColor` (pair with `.pin-marker--pending`).
 */
export function createPinTypeMarkerElement(
  pinType: PinType,
  catalog: CatalogPinType[] = [],
  pending = false,
): HTMLElement {
  const outline: PinMarkerOutline | null = pending ? "pending" : null
  const svg = buildPinMarkerSVGElement(pinType, outline, catalog)
  const wrap = document.createElement("div")
  wrap.style.cssText = `width: ${PIN_MARKER_WIDTH_PX}px; height: ${PIN_MARKER_HEIGHT_PX}px; cursor: pointer; line-height: 0;`
  wrap.appendChild(svg)
  return wrap
}

/**
 * Get label for a pin type
 */
export function getPinTypeLabel(
  pinType: PinType | null | undefined,
  catalog: CatalogPinType[] = []
): string {
  return resolvePinTypeConfig(pinType, catalog).label
}
