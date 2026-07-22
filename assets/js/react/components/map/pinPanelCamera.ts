/** Edge inset so pins aren’t flush against the panel or map chrome. */
export const PIN_PANEL_EDGE_MARGIN_PX = 48

/** Binary-search iterations for globe-aware zoom fitting. */
export const PIN_PANEL_ZOOM_SEARCH_ITERATIONS = 16

export type PanelPadding = {
  top: number
  right: number
  bottom: number
  left: number
}

/** True when (x, y) lies inside the padded viewport, inset by margin. */
export function pointInPaddedViewport(
  x: number,
  y: number,
  mapWidth: number,
  mapHeight: number,
  padding: PanelPadding,
  margin: number,
): boolean {
  return (
    x >= padding.left + margin &&
    x <= mapWidth - padding.right - margin &&
    y >= padding.top + margin &&
    y <= mapHeight - padding.bottom - margin
  )
}

/**
 * Highest zoom ≤ currentZoom that keeps the focus point inside the padded
 * viewport (zoom-out only).
 *
 * Uses `projectAtZoom` so visibility is evaluated with the map’s real camera
 * projection (globe), not a flat-Mercator 2^Δz screen-scale approximation.
 */
export function zoomToKeepPointInPaddedViewport(options: {
  mapWidth: number
  mapHeight: number
  padding: PanelPadding
  margin: number
  currentZoom: number
  minZoom: number
  /** Project the focus lng/lat at the given zoom with panel padding applied. */
  projectAtZoom: (zoom: number) => { x: number; y: number }
}): number {
  const {
    mapWidth,
    mapHeight,
    padding,
    margin,
    currentZoom,
    minZoom,
    projectAtZoom,
  } = options

  const visibleAt = (zoom: number): boolean => {
    const { x, y } = projectAtZoom(zoom)
    return pointInPaddedViewport(x, y, mapWidth, mapHeight, padding, margin)
  }

  if (visibleAt(currentZoom) || !(visibleAt(minZoom))) return currentZoom

  // Max zoom in [minZoom, currentZoom] that keeps the point visible.
  let lo = minZoom
  let hi = currentZoom
  for (let i = 0; i < PIN_PANEL_ZOOM_SEARCH_ITERATIONS; i++) {
    const mid = (lo + hi) / 2
    if (visibleAt(mid)) lo = mid
    else hi = mid
  }
  return lo
}
