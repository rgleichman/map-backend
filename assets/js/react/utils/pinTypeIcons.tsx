import React from "react"
import type { PinType } from "../types"

/**
 * Pin type icon path data is from Heroicons (MIT).
 * https://github.com/tailwindlabs/heroicons

/** Heroicons 24 solid: cake, calendar, building-storefront */
const ICON_PATHS: Record<PinType, string> = {
  one_time: `<path d="m15 1.784-.796.795a1.125 1.125 0 1 0 1.591 0L15 1.784ZM12 1.784l-.796.795a1.125 1.125 0 1 0 1.591 0L12 1.784ZM9 1.784l-.796.795a1.125 1.125 0 1 0 1.591 0L9 1.784ZM9.75 7.547c.498-.021.998-.035 1.5-.042V6.75a.75.75 0 0 1 1.5 0v.755c.502.007 1.002.021 1.5.042V6.75a.75.75 0 0 1 1.5 0v.88l.307.022c1.55.117 2.693 1.427 2.693 2.946v1.018a62.182 62.182 0 0 0-13.5 0v-1.018c0-1.519 1.143-2.829 2.693-2.946l.307-.022v-.88a.75.75 0 0 1 1.5 0v.797ZM12 12.75c-2.472 0-4.9.184-7.274.54-1.454.217-2.476 1.482-2.476 2.916v.384a4.104 4.104 0 0 1 2.585.364 2.605 2.605 0 0 0 2.33 0 4.104 4.104 0 0 1 3.67 0 2.605 2.605 0 0 0 2.33 0 4.104 4.104 0 0 1 3.67 0 2.605 2.605 0 0 0 2.33 0 4.104 4.104 0 0 1 2.585-.364v-.384c0-1.434-1.022-2.7-2.476-2.917A49.138 49.138 0 0 0 12 12.75ZM21.75 18.131a2.604 2.604 0 0 0-1.915.165 4.104 4.104 0 0 1-3.67 0 2.605 2.605 0 0 0-2.33 0 4.104 4.104 0 0 1-3.67 0 2.605 2.605 0 0 0-2.33 0 4.104 4.104 0 0 1-3.67 0 2.604 2.604 0 0 0-1.915-.165v2.494c0 1.035.84 1.875 1.875 1.875h15.75c1.035 0 1.875-.84 1.875-1.875v-2.494Z"/>`,
  scheduled: `<path fill-rule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clip-rule="evenodd"/>`,
  food_bank: `<path d="M5.223 2.25c-.497 0-.974.198-1.325.55l-1.3 1.298A3.75 3.75 0 0 0 7.5 9.75c.627.47 1.406.75 2.25.75.844 0 1.624-.28 2.25-.75.626.47 1.406.75 2.25.75.844 0 1.623-.28 2.25-.75a3.75 3.75 0 0 0 4.902-5.652l-1.3-1.299a1.875 1.875 0 0 0-1.325-.549H5.223Z"/><path fill-rule="evenodd" d="M3 20.25v-8.755c1.42.674 3.08.673 4.5 0A5.234 5.234 0 0 0 9.75 12c.804 0 1.568-.182 2.25-.506a5.234 5.234 0 0 0 2.25.506c.804 0 1.567-.182 2.25-.506 1.42.674 3.08.675 4.5.001v8.755h.75a.75.75 0 0 1 0 1.5H2.25a.75.75 0 0 1 0-1.5H3Zm3-6a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-.75.75h-3a.75.75 0 0 1-.75-.75v-3Zm8.25-.75a.75.75 0 0 0-.75.75v5.25c0 .414.336.75.75.75h3a.75.75 0 0 0 .75-.75v-5.25a.75.75 0 0 0-.75-.75h-3Z" clip-rule="evenodd"/>`
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

/** Icon transform to fit 24x24 viewBox into circle at (20,14) r=10 */
const MARKER_ICON_TRANSFORM = "translate(20,14) scale(0.833) translate(-12,-12)"

/**
 * Create an SVG marker for a specific pin type (data URL).
 * Embeds the pin-type icon path inside the teardrop for consistent rendering.
 */
export function createPinTypeMarkerSVG(pinType: PinType | null | undefined): string {
  const config = getPinTypeConfig(pinType)
  const iconFill = config.textColor

  const svg = `
    <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
      </defs>
      <path d="M20 0 C28 0 35 7 35 16 C35 28 20 50 20 50 C20 50 5 28 5 16 C5 7 12 0 20 0 Z"
            fill="${config.color}"
            filter="url(#shadow)"/>
      <circle cx="20" cy="14" r="10" fill="${config.backgroundColor}"/>
      <g transform="${MARKER_ICON_TRANSFORM}" fill="${iconFill}">
        ${config.iconPath}
      </g>
      <path d="M20 2 C27 2 33 8 33 16 C33 26 20 44 20 44 C20 44 7 26 7 16 C7 8 13 2 20 2 Z"
            fill="none"
            stroke="${config.backgroundColor}"
            stroke-width="1.5"
            opacity="0.6"/>
    </svg>
  `

  return `data:image/svg+xml;base64,${btoa(svg)}`
}

const TEARDROP_PATH =
  "M20 0 C28 0 35 7 35 16 C35 28 20 50 20 50 C20 50 5 28 5 16 C5 7 12 0 20 0 Z"

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
  const config = getPinTypeConfig(pinType)
  const iconFill = config.textColor
  const pending = options?.pending ?? false

  const outlinePath = pending
    ? `<path d="${TEARDROP_PATH}" fill="none" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/>`
    : ""

  const mainPathFillOpacity = pending ? "0.72" : "1"
  const circleFillOpacity = pending ? "0.85" : "1"
  const shadowFilter = pending ? "" : ' filter="url(#shadow)"'

  const svg = `
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
        <g transform="${MARKER_ICON_TRANSFORM}" fill="${iconFill}">
          ${config.iconPath}
        </g>
      </g>
    </svg>
  `

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
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      width={size}
      height={size}
      className={className}
    >
      <g dangerouslySetInnerHTML={{ __html: config.iconPath }} />
    </svg>
  )
}
