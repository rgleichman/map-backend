/**
 * Layout tokens for the Phoenix site header (`layouts/root.html.heex`).
 * Keep in sync with `--site-header-height` in `assets/css/app.css`.
 */
export const SITE_HEADER_HEIGHT_CSS_VAR = "--site-header-height"

/** Use in inline styles, e.g. `{ top: siteHeaderTop() }`. */
export function siteHeaderTop(): string {
  return `var(${SITE_HEADER_HEIGHT_CSS_VAR})`
}

/** Fixed element below the site header, filling the remaining viewport height. */
export const SITE_HEADER_FIXED_PANEL_CLASSES =
  "top-[var(--site-header-height)] h-[calc(100%-var(--site-header-height))]"
