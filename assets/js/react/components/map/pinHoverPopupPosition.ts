import type { Offset, PositionAnchor } from "maplibre-gl"

/** Matches DOM / SVG teardrop marker (`createPinTypeMarkerElement`). */
export const PIN_MARKER_HEIGHT_PX = 50
export const PIN_MARKER_WIDTH_PX = 40

const GAP_PX = 8

/** Clear the pin body when the popup sits above the tip (`bottom*` anchors). */
const ABOVE_PIN_OFFSET_Y = -(PIN_MARKER_HEIGHT_PX + GAP_PX)

/** Clear half the marker width when the popup sits beside the tip (`left`/`right`). */
const BESIDE_PIN_OFFSET_X = PIN_MARKER_WIDTH_PX / 2 + GAP_PX

export const PIN_HOVER_POPUP_PADDING = { top: 8, bottom: 8, left: 8, right: 8 } as const

/** Edge padding for hover popups, plus extra right inset when the pin panel covers the map. */
export function pinHoverPopupPadding(panelRightPx = 0): {
  top: number
  bottom: number
  left: number
  right: number
} {
  return {
    top: PIN_HOVER_POPUP_PADDING.top,
    bottom: PIN_HOVER_POPUP_PADDING.bottom,
    left: PIN_HOVER_POPUP_PADDING.left,
    right: PIN_HOVER_POPUP_PADDING.right + Math.max(0, panelRightPx),
  }
}

/**
 * Per-anchor pixel offsets. Bottom anchors lift by marker height; left/right
 * shift by half marker width so the popup clears the teardrop (lng/lat is the tip).
 */
export const pinHoverPopupOffset = {
  center: [0, 0],
  top: [0, GAP_PX],
  "top-left": [BESIDE_PIN_OFFSET_X, GAP_PX],
  "top-right": [-BESIDE_PIN_OFFSET_X, GAP_PX],
  bottom: [0, ABOVE_PIN_OFFSET_Y],
  "bottom-left": [BESIDE_PIN_OFFSET_X, ABOVE_PIN_OFFSET_Y],
  "bottom-right": [-BESIDE_PIN_OFFSET_X, ABOVE_PIN_OFFSET_Y],
  left: [BESIDE_PIN_OFFSET_X, 0],
  right: [-BESIDE_PIN_OFFSET_X, 0],
} as const satisfies Offset

type Padding = { top: number; bottom: number; left: number; right: number }

type Rect = { left: number; top: number; right: number; bottom: number }

/**
 * Prefer left (popup to the right of the pin), then nearby corners, then the
 * opposite side / above / below.
 */
const ANCHOR_PREFERENCE: PositionAnchor[] = [
  "left",
  "top-left",
  "bottom-left",
  "right",
  "top-right",
  "bottom-right",
  "top",
  "bottom",
]

/** Origin of the popup box relative to (point + offset), matching MapLibre `anchorTranslate`. */
function popupOriginFraction(anchor: PositionAnchor): { fx: number; fy: number } {
  switch (anchor) {
    case "center":
      return { fx: 0.5, fy: 0.5 }
    case "top":
      return { fx: 0.5, fy: 0 }
    case "top-left":
      return { fx: 0, fy: 0 }
    case "top-right":
      return { fx: 1, fy: 0 }
    case "bottom":
      return { fx: 0.5, fy: 1 }
    case "bottom-left":
      return { fx: 0, fy: 1 }
    case "bottom-right":
      return { fx: 1, fy: 1 }
    case "left":
      return { fx: 0, fy: 0.5 }
    case "right":
      return { fx: 1, fy: 0.5 }
  }
}

function popupRectForAnchor(
  anchor: PositionAnchor,
  x: number,
  y: number,
  popupWidth: number,
  popupHeight: number,
): Rect {
  const [ox, oy] = pinHoverPopupOffset[anchor]
  const { fx, fy } = popupOriginFraction(anchor)
  const left = x + ox - fx * popupWidth
  const top = y + oy - fy * popupHeight
  return { left, top, right: left + popupWidth, bottom: top + popupHeight }
}

function overflowAmount(rect: Rect, mapWidth: number, mapHeight: number, padding: Padding): number {
  return (
    Math.max(0, padding.left - rect.left) +
    Math.max(0, padding.top - rect.top) +
    Math.max(0, rect.right - (mapWidth - padding.right)) +
    Math.max(0, rect.bottom - (mapHeight - padding.bottom))
  )
}

/**
 * Pick a MapLibre popup anchor that keeps the full popup box on-screen,
 * preferring `left` when it fits.
 */
export function choosePinHoverPopupAnchor({
  x,
  y,
  mapWidth,
  mapHeight,
  popupWidth,
  popupHeight,
  padding = PIN_HOVER_POPUP_PADDING,
}: {
  x: number
  y: number
  mapWidth: number
  mapHeight: number
  popupWidth: number
  popupHeight: number
  padding?: Padding
}): PositionAnchor {
  let best: PositionAnchor = "left"
  let bestOverflow = Number.POSITIVE_INFINITY

  for (const anchor of ANCHOR_PREFERENCE) {
    const rect = popupRectForAnchor(anchor, x, y, popupWidth, popupHeight)
    const overflow = overflowAmount(rect, mapWidth, mapHeight, padding)
    if (overflow === 0) return anchor
    if (overflow < bestOverflow) {
      bestOverflow = overflow
      best = anchor
    }
  }

  return best
}
