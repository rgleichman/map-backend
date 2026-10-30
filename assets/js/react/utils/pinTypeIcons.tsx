import pinIconsJson from "../../../shared/pin_icons.json"
import type { CatalogPinType, PinIconName as PinIconNameType, PinType } from "../types"
import {
  DEFAULT_PIN_TYPE_COLORS,
  PIN_TYPE_COLORS,
  type PinTypeColorEntry
} from "./pinTypeColors"
import { findPinType, markerColor } from "./customPinTypes"

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
  }
}

/** Icon transform to fit 24x24 viewBox into circle (matches DOM marker). */
const MARKER_ICON_TRANSFORM = "translate(20,14) scale(0.833) translate(-12,-12)"

const TEARDROP_PATH =
  "M20 0 C28 0 35 7 35 16 C35 28 20 50 20 50 C20 50 5 28 5 16 C5 7 12 0 20 0 Z"

/**
 * Teardrop outline styles used when building marker SVGs.
 * - pending: stroke via CSS `currentColor` (DOM placement; see `.pin-marker--pending`)
 * - selected: baked light green (dark-theme primary) for MapLibre selected-pin images
 * - new: baked amber stroke for MapLibre “new since last visit” images
 * - awaiting: baked dashed sky stroke for MapLibre moderation-pending pins
 */
export type PinMarkerOutline = "pending" | "selected" | "new" | "awaiting"

/** MapLibre image ids that use a baked outline variant. */
export type PinMarkerMapOutline = Extract<PinMarkerOutline, "selected" | "new" | "awaiting">

/** Stroke for “new since last visit” teardrop outline (not `--color-primary`). */
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
 * Includes resolved glyph + marker color so catalog edits change the GeoJSON `icon-image`.
 */
export function getPinTypeMarkerImageId(
  pinType: PinType,
  catalog: CatalogPinType[] = [],
  outline?: PinMarkerMapOutline,
): string {
  const config = resolvePinTypeConfig(pinType, catalog)
  const slug = pinType || DEFAULT_PIN_ICON
  const base = `pin-icon-${slug}-${config.iconKey}-${markerImageColorToken(config.color)}`
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

function buildPinMarkerSVGStringFallback(
  pinType: PinType,
  outline: PinMarkerOutline | null,
  catalog: CatalogPinType[] = [],
): string {
  const config = resolvePinTypeConfig(pinType, catalog)
  const iconFill = config.textColor
  const iconKey = config.iconKey
  const iconGroupAttrs = isStrokeIcon(iconKey)
    ? `fill="none" stroke="${iconFill}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" color="${iconFill}"`
    : `fill="${iconFill}"`

  const stroke = markerOutlineStroke(outline)
  const outlined = stroke != null
  // “new” / pending / awaiting stay slightly translucent; selected is fully opaque so map labels cannot show through.
  const translucent = outline === "new" || outline === "pending" || outline === "awaiting"
  const outlinePath = outlined
    ? outline === "selected"
      ? `<path d="${TEARDROP_PATH}" fill="${stroke}" stroke="${stroke}" stroke-width="10" stroke-linejoin="round"/>
        <path d="${TEARDROP_PATH}" fill="${config.color}" fill-opacity="1"/>`
      : outline === "awaiting"
        ? `<path d="${TEARDROP_PATH}" fill="none" stroke="${stroke}" stroke-width="10" stroke-linejoin="round" stroke-dasharray="${AWAITING_STROKE_DASHARRAY}"/>`
        : `<path d="${TEARDROP_PATH}" fill="none" stroke="${stroke}" stroke-width="10" stroke-linejoin="round"/>`
    : ""
  const mainPathFillOpacity = translucent ? "0.72" : "1"
  const circleFillOpacity = translucent ? "0.85" : "1"
  const shadowFilter = outlined ? "" : ' filter="url(#shadow)"'
  const iconMarkup = iconLayerMarkup(iconKey)

  const mainTeardrop =
    outline === "selected"
      ? "" // already drawn opaque over the outline fill above
      : `<path d="${TEARDROP_PATH}"
              fill="${config.color}"
              fill-opacity="${mainPathFillOpacity}"${shadowFilter}/>`

  return `
    <svg width="40" height="50" viewBox="-3 -3 46 56" xmlns="${SVG_NS}">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
      </defs>
      <g transform="translate(3, 3)">
        ${outlinePath}
        ${mainTeardrop}
        <circle cx="20" cy="15" r="12" fill="${config.backgroundColor}" fill-opacity="${circleFillOpacity}"/>
        <g transform="${MARKER_ICON_TRANSFORM}" ${iconGroupAttrs}>
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
  const iconFill = config.textColor
  const iconKey = config.iconKey
  const outlined = outline != null
  const translucent = outline === "new" || outline === "pending" || outline === "awaiting"
  const mainPathFillOpacity = translucent ? "0.72" : "1"
  const circleFillOpacity = translucent ? "0.85" : "1"
  const stroke = markerOutlineStroke(outline)

  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("width", "40")
  svg.setAttribute("height", "50")
  svg.setAttribute("viewBox", "-3 -3 46 56")
  svg.setAttribute("xmlns", SVG_NS)

  const defs = document.createElementNS(SVG_NS, "defs")
  if (!outlined) {
    const filter = document.createElementNS(SVG_NS, "filter")
    filter.setAttribute("id", "shadow")
    filter.setAttribute("x", "-50%")
    filter.setAttribute("y", "-50%")
    filter.setAttribute("width", "200%")
    filter.setAttribute("height", "200%")

    const dropShadow = document.createElementNS(SVG_NS, "feDropShadow")
    dropShadow.setAttribute("dx", "0")
    dropShadow.setAttribute("dy", "2")
    dropShadow.setAttribute("stdDeviation", "3")
    dropShadow.setAttribute("flood-opacity", "0.3")

    filter.appendChild(dropShadow)
    defs.appendChild(filter)
  }
  svg.appendChild(defs)

  const rootGroup = document.createElementNS(SVG_NS, "g")
  rootGroup.setAttribute("transform", "translate(3, 3)")
  svg.appendChild(rootGroup)

  if (stroke != null) {
    const outlinePath = document.createElementNS(SVG_NS, "path")
    outlinePath.setAttribute("d", TEARDROP_PATH)
    outlinePath.setAttribute("stroke", stroke)
    outlinePath.setAttribute("stroke-width", "10")
    outlinePath.setAttribute("stroke-linejoin", "round")
    // Selected: opaque fill under the stroke so nothing shows through the halo.
    outlinePath.setAttribute("fill", outline === "selected" ? stroke : "none")
    if (outline === "awaiting") {
      outlinePath.setAttribute("stroke-dasharray", AWAITING_STROKE_DASHARRAY)
    }
    rootGroup.appendChild(outlinePath)
  }

  const teardrop = document.createElementNS(SVG_NS, "path")
  teardrop.setAttribute("d", TEARDROP_PATH)
  teardrop.setAttribute("fill", config.color)
  teardrop.setAttribute("fill-opacity", mainPathFillOpacity)
  if (!outlined) teardrop.setAttribute("filter", "url(#shadow)")
  rootGroup.appendChild(teardrop)

  const circle = document.createElementNS(SVG_NS, "circle")
  circle.setAttribute("cx", "20")
  circle.setAttribute("cy", "15")
  circle.setAttribute("r", "12")
  circle.setAttribute("fill", config.backgroundColor)
  circle.setAttribute("fill-opacity", circleFillOpacity)
  rootGroup.appendChild(circle)

  const iconGroup = document.createElementNS(SVG_NS, "g")
  iconGroup.setAttribute("transform", MARKER_ICON_TRANSFORM)
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
 * DOM placement marker (teardrop + icon). When `pending`, draws a primary-colored
 * outline via `currentColor` (pair with `.pin-marker--pending`).
 */
export function createPinTypeMarkerElement(
  pinType: PinType,
  catalog: CatalogPinType[] = [],
  pending = false,
): HTMLElement {
  const outline: PinMarkerOutline | null = pending ? "pending" : null
  const svg = buildPinMarkerSVGElement(pinType, outline, catalog)
  const wrap = document.createElement("div")
  wrap.style.cssText = "width: 40px; height: 50px; cursor: pointer; line-height: 0;"
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
