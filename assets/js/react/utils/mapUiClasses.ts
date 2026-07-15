/** Shared class strings for map chrome and filter chips (daisyUI semantic tokens). */

/** Glass fill + border used by overlay controls (search, filters, connections). */
export const MAP_OVERLAY_GLASS_CLASS =
  "bg-base-100/95 dark:bg-base-100/90 backdrop-blur-sm border border-base-300 shadow-lg"

export const MAP_OVERLAY_CONTROL_HOVER_CLASS =
  "hover:bg-base-200/90 dark:hover:bg-base-200/85 active:opacity-90 transition-colors"

/** Idle map overlay control button (filters trigger, connections idle, etc.). */
export const MAP_OVERLAY_CONTROL_CLASS = [
  "inline-flex shrink-0 items-center gap-1 min-h-10 px-2.5 rounded-xl text-xs font-medium whitespace-nowrap text-base-content",
  MAP_OVERLAY_GLASS_CLASS,
  MAP_OVERLAY_CONTROL_HOVER_CLASS,
].join(" ")

/** Selected primary chrome (e.g. connections when pressed). */
export const MAP_OVERLAY_CONTROL_ACTIVE_CLASS =
  "inline-flex shrink-0 items-center gap-1.5 min-h-10 px-2.5 rounded-xl text-xs font-medium whitespace-nowrap border shadow-lg active:opacity-90 transition-colors bg-primary text-primary-content border-primary hover:bg-primary/90"

/** Search input/shell glass (same tokens as overlay controls, slightly larger type). */
export const MAP_SEARCH_SHELL_CLASS = [
  "min-h-10 rounded-xl text-sm text-base-content",
  MAP_OVERLAY_GLASS_CLASS,
].join(" ")

/** Section labels in filter panel / search dropdowns. */
export const SECTION_LABEL_CLASS =
  "text-[11px] font-semibold uppercase tracking-wide text-base-content/50"

/** Tone only (selected vs idle) for filter/picker chips. */
export function filterChipToneClass(selected: boolean): string {
  return selected
    ? "bg-primary text-primary-content"
    : "bg-base-200 text-base-content hover:bg-base-300"
}

/** Full chip button class for Mine / Saved / Time toggles. */
export function filterChipClass(
  selected: boolean,
  ...extra: Array<string | false | null | undefined>
): string {
  return [
    "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition min-h-[44px] sm:min-h-0",
    filterChipToneClass(selected),
    ...extra,
  ]
    .filter(Boolean)
    .join(" ")
}
