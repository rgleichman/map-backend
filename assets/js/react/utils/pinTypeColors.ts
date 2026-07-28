import pinTypeColorsJson from "../../../shared/pin_type_colors.json"

export type PinTypeColorEntry = {
  label: string
  description: string
  color: string
  backgroundColor: string
  borderColor: string
  textColor: string
}

/**
 * Palette fallbacks for catalog rows without `marker_color`, keyed by slug —
 * see assets/shared/pin_type_colors.json.
 */
export const PIN_TYPE_COLORS: Record<string, PinTypeColorEntry> = pinTypeColorsJson as Record<
  string,
  PinTypeColorEntry
>

/** Palette used when the slug has no entry and the catalog has no color. */
export const DEFAULT_PIN_TYPE_COLORS: PinTypeColorEntry = PIN_TYPE_COLORS.other

export function getPinTypeColorEntry(slug: string | null | undefined): PinTypeColorEntry {
  if (slug != null && slug in PIN_TYPE_COLORS) {
    return PIN_TYPE_COLORS[slug]
  }
  return DEFAULT_PIN_TYPE_COLORS
}
