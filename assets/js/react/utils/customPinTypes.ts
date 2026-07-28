import type { CatalogPinType, CustomFieldSchema, PinType } from "../types"

/** Fallback marker color for catalog rows without `marker_color`. */
export const DEFAULT_MARKER_COLOR = "#6366f1"

/** Slug of a catalog row (`pin_type` mirrors `slug` on the wire). */
export function pinTypeSlug(pinType: CatalogPinType): string {
  return pinType.slug || pinType.pin_type || ""
}

export function findPinType(
  slug: string | null | undefined,
  catalog: CatalogPinType[]
): CatalogPinType | undefined {
  if (!slug) return undefined
  return catalog.find((t) => pinTypeSlug(t) === slug)
}

export function findPinTypeById(
  id: number | null | undefined,
  catalog: CatalogPinType[]
): CatalogPinType | undefined {
  if (id == null) return undefined
  return catalog.find((t) => t.id === id)
}

export function schemaFields(pinType: CatalogPinType | undefined): CustomFieldSchema[] {
  return pinType?.schema?.fields ?? []
}

export function markerColor(pinType: CatalogPinType | undefined): string | null {
  return pinType?.marker_color || null
}

/** Slugs the user can pick from, in catalog order (enabled rows only). */
export function listSelectablePinTypes(catalog: CatalogPinType[]): PinType[] {
  return catalog.filter((t) => t.enabled !== false).map(pinTypeSlug).filter((slug) => slug !== "")
}

/** Slugs present on the given pins (for filter lists). */
export function listFilterPinTypes(pins: { pin_type: PinType }[]): PinType[] {
  return [...new Set(pins.map((p) => p.pin_type))]
}
