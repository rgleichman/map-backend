/** Edge inset so pins aren’t flush against the panel or map chrome. */
export const PIN_PANEL_EDGE_MARGIN_PX = 48

/** Sub-pixel slack for “inside” checks after globe project. */
export const PIN_PANEL_NUDGE_TOLERANCE_PX = 0.5

export type PanelPadding = {
  top: number
  right: number
  bottom: number
  left: number
}

export type ScreenPoint = { x: number; y: number }

/** True when (x, y) lies inside the padded viewport, inset by margin (± slack). */
export function pointInPaddedViewport(
  x: number,
  y: number,
  mapWidth: number,
  mapHeight: number,
  padding: PanelPadding,
  margin: number,
  slackPx: number = 0,
): boolean {
  return (
    x >= padding.left + margin - slackPx &&
    x <= mapWidth - padding.right - margin + slackPx &&
    y >= padding.top + margin - slackPx &&
    y <= mapHeight - padding.bottom - margin + slackPx
  )
}

/**
 * Nearest screen point inside the padded margin box for a projected pin.
 * Returns null when the pin is already inside (no camera move needed).
 *
 * Pair with MapLibre globe `easeTo({ center: pin, offset, zoom })` so
 * `setLocationAtPoint` runs under the hood at a **locked** zoom (passing
 * `zoom` prevents lat→zoom planet-size adjustment). Do not use planar
 * `unproject(center + Δ)`.
 */
export function targetScreenPointInPaddedViewport(
  x: number,
  y: number,
  mapWidth: number,
  mapHeight: number,
  padding: PanelPadding,
  margin: number,
): ScreenPoint | null {
  if (pointInPaddedViewport(x, y, mapWidth, mapHeight, padding, margin)) {
    return null
  }

  const minX = padding.left + margin
  const maxX = mapWidth - padding.right - margin
  const minY = padding.top + margin
  const maxY = mapHeight - padding.bottom - margin

  if (maxX < minX || maxY < minY) return null

  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY),
  }
}
