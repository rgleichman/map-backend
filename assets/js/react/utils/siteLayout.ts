/**
 * Layout tokens for the Phoenix site header (`layouts/root.html.heex`).
 * Keep in sync with `--site-header-height` in `assets/css/app.css`.
 *
 * Use `--site-header-height` only for window-fixed UI (side panel, etc.).
 * Do not use it for map overlays inside MapShell — the shell already sits below the header.
 */
export const SITE_HEADER_HEIGHT_CSS_VAR = "--site-header-height"

/** Use in inline styles, e.g. `{ top: siteHeaderTop() }`. */
export function siteHeaderTop(): string {
  return `var(${SITE_HEADER_HEIGHT_CSS_VAR})`
}

/** Fixed element below the site header, filling the remaining viewport height. */
export const SITE_HEADER_FIXED_PANEL_CLASSES =
  "top-[var(--site-header-height)] h-[calc(100%-var(--site-header-height))]"

/**
 * Map viewport inside MapShell: fills remaining height below in-flow chrome.
 * Children (MapCanvas, overlays) position absolute/inset relative to this box.
 */
export const MAP_VIEWPORT_CLASSES = "relative min-h-0 flex-1 w-full"

/**
 * Top inset for floating panels inside the map viewport.
 * Never add --site-header-height or toolbar height — chrome is in document flow.
 */
export const MAP_SHELL_OVERLAY_TOP = "0.5rem"

/** Bottom inset for floating panels inside the map viewport (safe-area aware). */
export const MAP_SHELL_OVERLAY_BOTTOM = "max(1rem, env(safe-area-inset-bottom))"

export function mapShellOverlayTop(): string {
  return MAP_SHELL_OVERLAY_TOP
}

/**
 * Vertical offset for React overlays in the top-right (e.g. filters) so they sit
 * below MapLibre's GeolocateControl (~29px + margin).
 */
export const MAPLIBRE_GEOLOCATE_RESERVE = "2.75rem"

export function mapShellTopRightOverlayTop(): string {
  return `calc(${MAP_SHELL_OVERLAY_TOP} + ${MAPLIBRE_GEOLOCATE_RESERVE})`
}

/**
 * Form vs overlay: inputs that affect pin save (title, tags, community options, etc.)
 * belong in PinModal / PinComposer — not in floating MapShell overlays. Overlays are for
 * map chrome only (legend, filters, toolbar). See PinComposer / PinFlowUI.
 *
 * Z-index ladder (Tailwind classes):
 * - 10–20: map overlays (legend, filters)
 * - 30: site footer links, React ? help button
 * - 40: side panel, placement bar
 * - 50+: modals
 */
