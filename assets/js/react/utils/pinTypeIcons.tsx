import type { PinType } from "../types"

export type PinTypeConfig = {
  label: string
  color: string
  backgroundColor: string
  borderColor: string
  textColor: string
  icon: string
}

const pinTypeConfigs: Record<PinType, PinTypeConfig> = {
  one_time: {
    label: "One-Time Offering",
    color: "#f97316", // orange-500
    backgroundColor: "#fed7aa", // orange-100
    borderColor: "#f97316",
    textColor: "#7c2d12", // orange-900
    icon: "🍕"
  },
  scheduled: {
    label: "Scheduled Offering",
    color: "#3b82f6", // blue-500
    backgroundColor: "#dbeafe", // blue-100
    borderColor: "#3b82f6",
    textColor: "#1e3a8a", // blue-900
    icon: "📅"
  },
  food_bank: {
    label: "Food Bank / Pantry",
    color: "#22c55e", // green-500
    backgroundColor: "#dcfce7", // green-100
    borderColor: "#22c55e",
    textColor: "#166534", // green-900
    icon: "🏪"
  }
}

/**
 * Get configuration for a pin type including colors and icon
 */
export function getPinTypeConfig(pinType: PinType): PinTypeConfig {
  return pinTypeConfigs[pinType]
}

/**
 * Create an SVG marker element for a specific pin type
 * Returns SVG as a data URL suitable for use with MapLibre markers
 */
export function createPinTypeMarkerSVG(pinType: PinType): string {
  const config = getPinTypeConfig(pinType)
  
  // SVG marker with emoji icon and type-specific color
  const svg = `
    <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
      <!-- Outer shadow -->
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- Main marker shape -->
      <path d="M20 0 C28 0 35 7 35 16 C35 28 20 50 20 50 C20 50 5 28 5 16 C5 7 12 0 20 0 Z" 
            fill="${config.color}" 
            filter="url(#shadow)"/>
      
      <!-- Light inner area for icon -->
      <circle cx="20" cy="14" r="10" fill="${config.backgroundColor}"/>
      
      <!-- Icon text (emoji will be replaced with foreignObject) -->
      <text x="20" y="20" font-size="20" text-anchor="middle" dominant-baseline="middle">
        ${config.icon}
      </text>
      
      <!-- Border highlight -->
      <path d="M20 2 C27 2 33 8 33 16 C33 26 20 44 20 44 C20 44 7 26 7 16 C7 8 13 2 20 2 Z" 
            fill="none" 
            stroke="${config.backgroundColor}" 
            stroke-width="1.5"
            opacity="0.6"/>
    </svg>
  `

  // Encode SVG as data URL
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

/**
 * Alternative: Create a simple HTML element marker (may be more compatible)
 * Returns an HTML element that MapLibre can use as a marker
 */
export function createPinTypeMarkerElement(pinType: PinType): HTMLElement {
  const config = getPinTypeConfig(pinType)
  
  const element = document.createElement('div')
  element.style.cssText = `
    width: 40px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${config.color};
    border: 2px solid ${config.borderColor};
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    cursor: pointer;
  `
  
  const iconSpan = document.createElement('span')
  iconSpan.textContent = config.icon
  iconSpan.style.cssText = `
    font-size: 24px;
    transform: rotate(45deg);
    display: flex;
    align-items: center;
    justify-content: center;
  `
  
  element.appendChild(iconSpan)
  return element
}

/**
 * Get label for a pin type
 */
export function getPinTypeLabel(pinType: PinType): string {
  return pinTypeConfigs[pinType].label
}

/**
 * Get color for a pin type (for use in UI elements)
 */
export function getPinTypeColor(pinType: PinType): string {
  return pinTypeConfigs[pinType].color
}
