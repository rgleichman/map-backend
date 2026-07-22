/**
 * Layout tokens for the Phoenix site header (`layouts/root.html.heex`).
 * Keep in sync with `--site-header-height` in `assets/css/app.css`.
 *
 * Use `--site-header-height` only for window-fixed UI (floating pin panel, etc.).
 * Do not use it for map overlays inside MapShell — the shell already sits below the header.
 */
export const SITE_HEADER_HEIGHT_CSS_VAR = "--site-header-height"

/** Use in inline styles, e.g. `{ top: siteHeaderTop() }`. */
export function siteHeaderTop(): string {
  return `var(${SITE_HEADER_HEIGHT_CSS_VAR})`
}

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

/**
 * Shared card chrome for floating pin UI (mobile centered modals + desktop right panel).
 * Keep visual sync across PinOverlay, FieldEditorModal, and pin content cards.
 */
export const PIN_FLOATING_CARD_CLASSES =
  "bg-base-100 rounded-box border border-base-300 shadow-xl"

/** CSS var set by app.js from the desktop footer height on md+; 0 below md. */
export const MAP_DESKTOP_FOOTER_RESERVE_CSS_VAR = "--map-desktop-footer-reserve"

export function mapShellOverlayTop(): string {
  return MAP_SHELL_OVERLAY_TOP
}

/**
 * Bottom inset for map-shell overlays that must clear the desktop floating footer.
 * Below md, --map-desktop-footer-reserve is 0 so this matches MAP_SHELL_OVERLAY_BOTTOM.
 */
export function mapShellOverlayBottomAboveFooter(): string {
  return `calc(var(${MAP_DESKTOP_FOOTER_RESERVE_CSS_VAR}, 0px) + ${MAP_SHELL_OVERLAY_BOTTOM})`
}

/**
 * Bottom offset for viewport-fixed UI on the map page (e.g. help button).
 * Matches Tailwind bottom-3 (0.75rem) when footer reserve is 0.
 */
export function mapPageFixedBottom(): string {
  return `calc(var(${MAP_DESKTOP_FOOTER_RESERVE_CSS_VAR}, 0px) + max(0.75rem, env(safe-area-inset-bottom)))`
}

/**
 * Vertical offset for React overlays in the top-right (e.g. filters) so they sit
 * below MapLibre's GeolocateControl (~29px + margin).
 */
export const MAPLIBRE_GEOLOCATE_RESERVE = "2.75rem"

export function mapShellTopRightOverlayTop(): string {
  return `calc(${MAP_SHELL_OVERLAY_TOP} + ${MAPLIBRE_GEOLOCATE_RESERVE})`
}

/** Unified map search input height (matches MapSearch min-h-10). */
export const MAP_SEARCH_INPUT_HEIGHT = "2.5rem"

/** Gap below map search before the pin type legend may begin. */
export const PIN_TYPE_LEGEND_TOP_GAP = "0.5rem"

/**
 * Max height for the bottom-left pin type legend so it stays below the
 * top-left search control (and above the desktop footer reserve).
 */
export function mapShellPinTypeLegendMaxHeight(): string {
  return `calc(100% - ${mapShellOverlayBottomAboveFooter()} - ${MAP_SHELL_OVERLAY_TOP} - ${MAP_SEARCH_INPUT_HEIGHT} - ${PIN_TYPE_LEGEND_TOP_GAP})`
}

/**
 * Vertical clearance for the fixed ? help control above the footer band
 * (btn-circle btn-sm ≈ 2rem + gap).
 */
export const MAP_HELP_BUTTON_CLEARANCE = "2.5rem"

/** Bottom inset for top-right overlays that must clear the help button and footer. */
export function mapShellOverlayBottomAboveHelp(): string {
  return `calc(${mapShellOverlayBottomAboveFooter()} + ${MAP_HELP_BUTTON_CLEARANCE})`
}

/**
 * Max height for the top-right filters panel when its parent is a flex-1
 * column that already clears the connections toggle, help button, and footer
 * (see MapCanvas top-right stack).
 */
export function mapShellFiltersMaxHeight(): string {
  return "100%"
}

/**
 * Desktop pin detail / composer / type-picker floating right panel (`max-w-md` = 28rem).
 * Keep in sync with PinFlowUI panel classes and FieldEditorModal right offset.
 */
export const DESKTOP_PIN_PANEL_MAX_WIDTH = "28rem"
export const DESKTOP_PIN_PANEL_MAX_WIDTH_PX = 448
/** Gap between viewport edge / sibling panels and the floating pin panel. */
export const DESKTOP_PIN_PANEL_INSET = "1rem"
export const DESKTOP_PIN_PANEL_INSET_PX = 16
/** Gap between the floating pin panel and the field editor to its left. */
export const DESKTOP_PIN_PANEL_GAP = "0.5rem"

/** Shell for the desktop floating pin panel (position via desktopPinPanelFloatingStyle). */
export const DESKTOP_PIN_PANEL_CLASSES = [
  "fixed z-40 flex flex-col overflow-hidden w-full max-w-md",
  PIN_FLOATING_CARD_CLASSES,
].join(" ")

/** Shell for the desktop floating field editor beside the pin panel. */
export const DESKTOP_FIELD_EDITOR_CLASSES = [
  "fixed z-[60] flex flex-col overflow-hidden",
  PIN_FLOATING_CARD_CLASSES,
].join(" ")

/** Top / right / bottom for the floating desktop pin panel (below site header). */
export function desktopPinPanelFloatingStyle(): Record<string, string> {
  return {
    top: `calc(var(${SITE_HEADER_HEIGHT_CSS_VAR}) + ${MAP_SHELL_OVERLAY_TOP})`,
    right: `max(${DESKTOP_PIN_PANEL_INSET}, env(safe-area-inset-right))`,
    bottom: mapShellOverlayBottomAboveFooter(),
  }
}

/** Top / left / right / bottom for the field editor docked left of the pin panel. */
export function desktopFieldEditorFloatingStyle(): Record<string, string> {
  return {
    top: `calc(var(${SITE_HEADER_HEIGHT_CSS_VAR}) + ${MAP_SHELL_OVERLAY_TOP})`,
    left: `max(${DESKTOP_PIN_PANEL_INSET}, env(safe-area-inset-left))`,
    right: `calc(${DESKTOP_PIN_PANEL_INSET} + ${DESKTOP_PIN_PANEL_MAX_WIDTH} + ${DESKTOP_PIN_PANEL_GAP})`,
    bottom: mapShellOverlayBottomAboveFooter(),
  }
}

/** Duration for MapLibre easeTo when shifting the globe for the pin panel. */
export const DESKTOP_PIN_PANEL_PADDING_DURATION_MS = 300

/**
 * MapLibre right padding so the camera focal area sits in the unobscured map
 * when the desktop pin panel is open. Includes the panel’s right inset.
 * Caps at viewport width when the panel is full-bleed.
 */
export function desktopPinPanelMapPaddingRight(
  viewportWidthPx: number,
  panelOpen: boolean,
): number {
  if (!panelOpen) return 0
  const obscured = DESKTOP_PIN_PANEL_MAX_WIDTH_PX + DESKTOP_PIN_PANEL_INSET_PX
  if (!Number.isFinite(viewportWidthPx) || viewportWidthPx <= 0) {
    return obscured
  }
  return Math.min(obscured, viewportWidthPx)
}

/**
 * Form vs overlay: inputs that affect pin save (title, tags, community options, etc.)
 * belong in PinModal / PinComposer — not in floating MapShell overlays. Overlays are for
 * map chrome only (legend, filters, toolbar). See PinComposer / PinFlowUI.
 *
 * Z-index ladder (Tailwind classes):
 * - 10–20: map overlays (legend, filters)
 * - 30: site footer links, React ? help button
 * - 40: floating pin panel, placement bar
 * - 50+: modals
 *
 * Bottom layout tokens (CSS vars in app.css, measured in app.js):
 * - --map-desktop-footer-reserve: footer band height on md+
 * - --map-help-button-reserve: right margin so MapLibre attribution clears the ? button
 * - mapShellOverlayBottomAboveHelp / MAP_HELP_BUTTON_CLEARANCE: vertical clearance for ?
 * - --map-pin-legend-*: footer left padding so links clear the legend column on map pages
 */
