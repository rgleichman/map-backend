import React from "react"
import type { PinType } from "../types"

/**
 * Pin type icon path data: one_time from priv/static/images/carrot.svg (Lucide), rest from Heroicons (MIT).
 * https://github.com/tailwindlabs/heroicons
 */
/** one_time: Lucide carrot (stroke). scheduled/food_bank: Heroicons 24 solid. */
const ICON_PATHS: Record<PinType, string> = {
  one_time: `<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M2.27 21.7s9.87-3.5 12.73-6.36a4.5 4.5 0 0 0-6.36-6.37C5.77 11.84 2.27 21.7 2.27 21.7zM8.64 14l-2.05-2.04M15.34 15l-2.46-2.46"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M22 9s-1.33-2-3.5-2C16.86 7 15 9 15 9s1.33 2 3.5 2S22 9 22 9z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M15 2s-2 1.33-2 3.5S15 9 15 9s2-1.84 2-3.5C17 3.33 15 2 15 2z"/>`,
  scheduled: `<path fill-rule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clip-rule="evenodd"/>`,
  food_bank: `<path d="M5.223 2.25c-.497 0-.974.198-1.325.55l-1.3 1.298A3.75 3.75 0 0 0 7.5 9.75c.627.47 1.406.75 2.25.75.844 0 1.624-.28 2.25-.75.626.47 1.406.75 2.25.75.844 0 1.623-.28 2.25-.75a3.75 3.75 0 0 0 4.902-5.652l-1.3-1.299a1.875 1.875 0 0 0-1.325-.549H5.223Z"/><path fill-rule="evenodd" d="M3 20.25v-8.755c1.42.674 3.08.673 4.5 0A5.234 5.234 0 0 0 9.75 12c.804 0 1.568-.182 2.25-.506a5.234 5.234 0 0 0 2.25.506c.804 0 1.567-.182 2.25-.506 1.42.674 3.08.675 4.5.001v8.755h.75a.75.75 0 0 1 0 1.5H2.25a.75.75 0 0 1 0-1.5H3Zm3-6a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-.75.75h-3a.75.75 0 0 1-.75-.75v-3Zm8.25-.75a.75.75 0 0 0-.75.75v5.25c0 .414.336.75.75.75h3a.75.75 0 0 0 .75-.75v-5.25a.75.75 0 0 0-.75-.75h-3Z" clip-rule="evenodd"/>`
}

/** Allowlist for icon path strings used with innerHTML/dangerouslySetInnerHTML (XSS guard). */
const ALLOWED_ICON_PATHS = new Set<string>(Object.values(ICON_PATHS))

function safeIconPath(path: string): string {
  return ALLOWED_ICON_PATHS.has(path) ? path : ICON_PATHS.one_time
}

export type PinTypeConfig = {
  label: string
  description: string
  color: string
  backgroundColor: string
  borderColor: string
  textColor: string
  iconPath: string
}

const pinTypeConfigs: Record<PinType, PinTypeConfig> = {
  one_time: {
    label: "One-Time Offering",
    description: "A single food offering event at a specific time",
    color: "#f97316",
    backgroundColor: "#fed7aa",
    borderColor: "#f97316",
    textColor: "#7c2d12",
    iconPath: ICON_PATHS.one_time
  },
  scheduled: {
    label: "Scheduled Offering",
    description: "Recurring food offerings on a regular schedule",
    color: "#3b82f6",
    backgroundColor: "#dbeafe",
    borderColor: "#3b82f6",
    textColor: "#1e3a8a",
    iconPath: ICON_PATHS.scheduled
  },
  food_bank: {
    label: "Food Bank / Pantry",
    description: "A food bank or pantry with regular open hours",
    color: "#22c55e",
    backgroundColor: "#dcfce7",
    borderColor: "#22c55e",
    textColor: "#166534",
    iconPath: ICON_PATHS.food_bank
  }
}

export const PIN_TYPES: PinType[] = ["one_time", "scheduled", "food_bank"]

const defaultPinType: PinType = "one_time"

/**
 * Get configuration for a pin type including colors and icon.
 * Falls back to one_time config when pinType is missing or unknown.
 */
export function getPinTypeConfig(pinType: PinType | null | undefined): PinTypeConfig {
  const key = pinType != null && pinType in pinTypeConfigs ? pinType : defaultPinType
  return pinTypeConfigs[key]
}

/** Icon transform to fit 24x24 viewBox into circle (matches DOM marker). */
const MARKER_ICON_TRANSFORM = "translate(20,14) scale(0.833) translate(-12,-12)"

const TEARDROP_PATH =
  "M20 0 C28 0 35 7 35 16 C35 28 20 50 20 50 C20 50 5 28 5 16 C5 7 12 0 20 0 Z"

/** Image id used in MapLibre for pin-type marker icons (for use with map.addImage / icon-image). */
export function getPinTypeMarkerImageId(pinType: PinType | null | undefined): string {
  const key = pinType != null && pinType in pinTypeConfigs ? pinType : defaultPinType
  return `pin-icon-${key}`
}

/**
 * Build the pin marker SVG string (teardrop + icon). Single source of truth for DOM marker and map images.
 */
function buildPinMarkerSVGString(
  pinType: PinType | null | undefined,
  pending: boolean
): string {
  const config = getPinTypeConfig(pinType)
  const iconFill = config.textColor
  const isStrokeIcon = pinType === "one_time"
  const iconGroupAttrs = isStrokeIcon
    ? `fill="none" stroke="${iconFill}" color="${iconFill}"`
    : `fill="${iconFill}"`

  const outlinePath = pending
    ? `<path d="${TEARDROP_PATH}" fill="none" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/>`
    : ""
  const mainPathFillOpacity = pending ? "0.72" : "1"
  const circleFillOpacity = pending ? "0.85" : "1"
  const shadowFilter = pending ? "" : ' filter="url(#shadow)"'

  return `
    <svg width="40" height="50" viewBox="-3 -3 46 56" xmlns="http://www.w3.org/2000/svg">
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
          ${safeIconPath(config.iconPath)}
        </g>
      </g>
    </svg>
  `
}

/**
 * Create an SVG marker for a specific pin type (data URL). Uses same SVG as createPinTypeMarkerElement with pending false.
 */
export function createPinTypeMarkerSVG(pinType: PinType | null | undefined): string {
  const svg = buildPinMarkerSVGString(pinType, false)
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
  pinType: PinType,
  options?: CreatePinMarkerOptions
): HTMLElement {
  const svg = buildPinMarkerSVGString(pinType, options?.pending ?? false)
  const wrap = document.createElement("div")
  wrap.style.cssText = "width: 40px; height: 50px; cursor: pointer; line-height: 0;"
  wrap.innerHTML = svg
  return wrap
}

/**
 * Get label for a pin type
 */
export function getPinTypeLabel(pinType: PinType | null | undefined): string {
  return getPinTypeConfig(pinType).label
}

/**
 * Get color for a pin type (for use in UI elements)
 */
export function getPinTypeColor(pinType: PinType): string {
  return pinTypeConfigs[pinType].color
}

type PinTypeIconProps = {
  pinType: PinType | null | undefined
  className?: string
  size?: number
}

/**
 * Renders the SVG icon for a pin type. Use in legend and modal.
 * Size defaults to 24; use className for Tailwind (e.g. w-5 h-5).
 */
export function PinTypeIcon({ pinType, className, size = 24 }: PinTypeIconProps): React.ReactElement {
  const config = getPinTypeConfig(pinType)
  const isStrokeIcon = pinType === "one_time"
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={isStrokeIcon ? "none" : "currentColor"}
      stroke={isStrokeIcon ? "currentColor" : undefined}
      style={isStrokeIcon ? { color: config.textColor } : undefined}
      aria-hidden
      width={size}
      height={size}
      className={className}
    >
      <g dangerouslySetInnerHTML={{ __html: safeIconPath(config.iconPath) }} />
    </svg>
  )
}
