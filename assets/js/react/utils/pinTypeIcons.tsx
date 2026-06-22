import type { BuiltinPinType as BuiltinPinTypeName, CustomPinType, PinType } from "../types"
import {
  getPinTypeColorEntry,
  PIN_TYPE_COLORS,
  type PinTypeColorEntry
} from "./pinTypeColors"
import {
  BuiltinPinType,
  builtinIconKeyForPinType,
  customPinTypeMarkerImageId,
  isBuiltinPinType,
  isCustomPinType,
} from "./builtinPinType"
import {
  customTypeMarkerColor,
  findCustomPinType,
} from "./customPinTypes"

/**
 * Pin type icon path data: one_time from priv/static/images/carrot.svg (Lucide), rest from Heroicons (MIT).
 * https://github.com/tailwindlabs/heroicons
 */
type SvgPathDef = {
  d: string
  fillRule?: "evenodd" | "nonzero"
  clipRule?: "evenodd" | "nonzero"
}

/** one_time: Lucide carrot (stroke). scheduled/food_bank/other: Heroicons 24 solid (fill). */
export const ICON_PATH_DEFS: Record<BuiltinPinTypeName, SvgPathDef[]> = {
  [BuiltinPinType.OneTime]: [
    {
      d: "M2.27 21.7s9.87-3.5 12.73-6.36a4.5 4.5 0 0 0-6.36-6.37C5.77 11.84 2.27 21.7 2.27 21.7zM8.64 14l-2.05-2.04M15.34 15l-2.46-2.46"
    },
    { d: "M22 9s-1.33-2-3.5-2C16.86 7 15 9 15 9s1.33 2 3.5 2S22 9 22 9z" },
    { d: "M15 2s-2 1.33-2 3.5S15 9 15 9s2-1.84 2-3.5C17 3.33 15 2 15 2z" },
  ],
  [BuiltinPinType.Scheduled]: [
    {
      d: "M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z",
      fillRule: "evenodd",
      clipRule: "evenodd"
    }
  ],
  [BuiltinPinType.FoodBank]: [
    {
      d: "M5.223 2.25c-.497 0-.974.198-1.325.55l-1.3 1.298A3.75 3.75 0 0 0 7.5 9.75c.627.47 1.406.75 2.25.75.844 0 1.624-.28 2.25-.75.626.47 1.406.75 2.25.75.844 0 1.623-.28 2.25-.75a3.75 3.75 0 0 0 4.902-5.652l-1.3-1.299a1.875 1.875 0 0 0-1.325-.549H5.223Z"
    },
    {
      d: "M3 20.25v-8.755c1.42.674 3.08.673 4.5 0A5.234 5.234 0 0 0 9.75 12c.804 0 1.568-.182 2.25-.506a5.234 5.234 0 0 0 2.25.506c.804 0 1.567-.182 2.25-.506 1.42.674 3.08.675 4.5.001v8.755h.75a.75.75 0 0 1 0 1.5H2.25a.75.75 0 0 1 0-1.5H3Zm3-6a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-.75.75h-3a.75.75 0 0 1-.75-.75v-3Zm8.25-.75a.75.75 0 0 0-.75.75v5.25c0 .414.336.75.75.75h3a.75.75 0 0 0 .75-.75v-5.25a.75.75 0 0 0-.75-.75h-3Z",
      fillRule: "evenodd",
      clipRule: "evenodd"
    }
  ],
  [BuiltinPinType.Other]: [
    {
      d: "M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.267 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.267-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z",
      fillRule: "evenodd",
      clipRule: "evenodd"
    }
  ]
}

export type PinTypeConfig = PinTypeColorEntry & {
  /** Which builtin icon to render for this pin type. */
  iconKey: PinType
}

const pinTypeConfigs: Record<PinType, PinTypeConfig> = Object.fromEntries(
  (Object.keys(PIN_TYPE_COLORS) as PinType[]).map((pinType) => [
    pinType,
    { ...PIN_TYPE_COLORS[pinType], iconKey: pinType }
  ])
) as Record<PinType, PinTypeConfig>

export function resolvePinTypeConfig(
  pinType: PinType | string | null | undefined,
  catalog: CustomPinType[] = []
): PinTypeConfig {
  if (pinType && isBuiltinPinType(pinType)) {
    return getPinTypeConfig(pinType)
  }

  if (typeof pinType === "string" && isCustomPinType(pinType)) {
    const custom = findCustomPinType(pinType, catalog)
    const color = customTypeMarkerColor(custom)
    const base = getPinTypeConfig(BuiltinPinType.Other)
    return {
      ...base,
      label: custom?.label ?? pinType,
      description: custom?.description ?? "Custom pin type",
      color,
      backgroundColor: color,
      borderColor: color,
    }
  }

  return getPinTypeConfig(pinType as PinType)
}

/**
 * Get configuration for a pin type including colors and icon.
 * Falls back via builtinIconKeyForPinType when pinType is missing or unknown.
 */
export function getPinTypeConfig(pinType: PinType | null | undefined): PinTypeConfig {
  const iconKey = builtinIconKeyForPinType(pinType)
  const colors = getPinTypeColorEntry(pinType)
  return { ...colors, iconKey: pinTypeConfigs[iconKey].iconKey }
}

/** Icon transform to fit 24x24 viewBox into circle (matches DOM marker). */
const MARKER_ICON_TRANSFORM = "translate(20,14) scale(0.833) translate(-12,-12)"

const TEARDROP_PATH =
  "M20 0 C28 0 35 7 35 16 C35 28 20 50 20 50 C20 50 5 28 5 16 C5 7 12 0 20 0 Z"

/** Image id used in MapLibre for pin-type marker icons (for use with map.addImage / icon-image). */
export function getPinTypeMarkerImageId(pinType: PinType | string | null | undefined): string {
  if (typeof pinType === "string" && isCustomPinType(pinType)) {
    return customPinTypeMarkerImageId(pinType)
  }
  const key = builtinIconKeyForPinType(pinType)
  return `pin-icon-${key}`
}

const SVG_NS = "http://www.w3.org/2000/svg"

function buildPinMarkerSVGStringFallback(
  pinType: PinType | string | null | undefined,
  pending: boolean,
  catalog: CustomPinType[] = []
): string {
  const config = resolvePinTypeConfig(pinType, catalog)
  const iconFill = config.textColor
  const iconKey = builtinIconKeyForPinType(pinType)
  const isStrokeIcon = iconKey === BuiltinPinType.OneTime
  const iconGroupAttrs = isStrokeIcon
    ? `fill="none" stroke="${iconFill}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" color="${iconFill}"`
    : `fill="${iconFill}"`

  const outlinePath = pending
    ? `<path d="${TEARDROP_PATH}" fill="none" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/>`
    : ""
  const mainPathFillOpacity = pending ? "0.72" : "1"
  const circleFillOpacity = pending ? "0.85" : "1"
  const shadowFilter = pending ? "" : ' filter="url(#shadow)"'
  const iconPaths = ICON_PATH_DEFS[iconKey]

  const iconMarkup = iconPaths
    .map((p) => {
      const attrs: string[] = [`d="${p.d}"`]
      if (p.fillRule) attrs.push(`fill-rule="${p.fillRule}"`)
      if (p.clipRule) attrs.push(`clip-rule="${p.clipRule}"`)
      return `<path ${attrs.join(" ")} />`
    })
    .join("")

  return `
    <svg width="40" height="50" viewBox="-3 -3 46 56" xmlns="${SVG_NS}">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
      </defs>
      <g transform="translate(3, 3)">
        ${outlinePath}
        <path d="${TEARDROP_PATH}"
              fill="${config.color}"
              fill-opacity="${mainPathFillOpacity}"${shadowFilter}/>
        <circle cx="20" cy="15" r="12" fill="${config.backgroundColor}" fill-opacity="${circleFillOpacity}"/>
        <g transform="${MARKER_ICON_TRANSFORM}" ${iconGroupAttrs}>
          ${iconMarkup}
        </g>
      </g>
    </svg>
  `
}

function buildPinMarkerSVGElement(
  pinType: PinType | string | null | undefined,
  pending: boolean,
  catalog: CustomPinType[] = []
): SVGSVGElement {
  const config = resolvePinTypeConfig(pinType, catalog)
  const iconFill = config.textColor
  const iconKey = builtinIconKeyForPinType(pinType)
  const isStrokeIcon = iconKey === BuiltinPinType.OneTime
  const mainPathFillOpacity = pending ? "0.72" : "1"
  const circleFillOpacity = pending ? "0.85" : "1"
  const iconPaths = ICON_PATH_DEFS[iconKey]

  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("width", "40")
  svg.setAttribute("height", "50")
  svg.setAttribute("viewBox", "-3 -3 46 56")
  svg.setAttribute("xmlns", SVG_NS)

  const defs = document.createElementNS(SVG_NS, "defs")
  if (!pending) {
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

  if (pending) {
    const outline = document.createElementNS(SVG_NS, "path")
    outline.setAttribute("d", TEARDROP_PATH)
    outline.setAttribute("fill", "none")
    outline.setAttribute("stroke", "currentColor")
    outline.setAttribute("stroke-width", "10")
    outline.setAttribute("stroke-linejoin", "round")
    rootGroup.appendChild(outline)
  }

  const teardrop = document.createElementNS(SVG_NS, "path")
  teardrop.setAttribute("d", TEARDROP_PATH)
  teardrop.setAttribute("fill", config.color)
  teardrop.setAttribute("fill-opacity", mainPathFillOpacity)
  if (!pending) teardrop.setAttribute("filter", "url(#shadow)")
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
  if (isStrokeIcon) {
    iconGroup.setAttribute("fill", "none")
    iconGroup.setAttribute("stroke", iconFill)
    iconGroup.setAttribute("stroke-width", "2")
    iconGroup.setAttribute("stroke-linecap", "round")
    iconGroup.setAttribute("stroke-linejoin", "round")
    iconGroup.setAttribute("color", iconFill)
  } else {
    iconGroup.setAttribute("fill", iconFill)
  }

  for (const p of iconPaths) {
    const path = document.createElementNS(SVG_NS, "path")
    path.setAttribute("d", p.d)
    if (p.fillRule) path.setAttribute("fill-rule", p.fillRule)
    if (p.clipRule) path.setAttribute("clip-rule", p.clipRule)
    iconGroup.appendChild(path)
  }

  rootGroup.appendChild(iconGroup)
  return svg
}

/**
 * Create an SVG marker for a specific pin type (data URL). Uses same SVG as createPinTypeMarkerElement with pending false.
 */
export function createPinTypeMarkerSVG(
  pinType: PinType | string | null | undefined,
  catalog: CustomPinType[] = []
): string {
  if (typeof document === "undefined" || typeof XMLSerializer === "undefined") {
    const svg = buildPinMarkerSVGStringFallback(pinType, false, catalog)
    return `data:image/svg+xml;base64,${btoa(svg)}`
  }

  const svgEl = buildPinMarkerSVGElement(pinType, false, catalog)
  const svg = new XMLSerializer().serializeToString(svgEl)
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export type CreatePinMarkerOptions = {
  /** When true, draw pin outline and lighter fill for pending (create/edit) state. */
  pending?: boolean
}

/**
 * Create a DOM element marker: single SVG (teardrop + icon), no rotation.
 */
export function createPinTypeMarkerElement(
  pinType: PinType | string,
  options?: CreatePinMarkerOptions,
  catalog: CustomPinType[] = []
): HTMLElement {
  const svg = buildPinMarkerSVGElement(pinType, options?.pending ?? false, catalog)
  const wrap = document.createElement("div")
  wrap.style.cssText = "width: 40px; height: 50px; cursor: pointer; line-height: 0;"
  wrap.appendChild(svg)
  return wrap
}

/**
 * Get label for a pin type
 */
export function getPinTypeLabel(
  pinType: PinType | string | null | undefined,
  catalog: CustomPinType[] = []
): string {
  return resolvePinTypeConfig(pinType, catalog).label
}
