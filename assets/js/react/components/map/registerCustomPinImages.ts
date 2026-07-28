import type { Map as MLMap } from "maplibre-gl"
import type { CatalogPinType, PinType } from "../../types"
import { pinTypeSlug } from "../../utils/customPinTypes"
import { createPinTypeMarkerSVG, getPinTypeMarkerImageId } from "../../utils/pinTypeIcons"

export function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Failed to load pin image"))
    img.src = dataUrl
  })
}

/**
 * Register marker images (normal + new + selected) for every catalog row and every
 * pin-type slug currently on the map. Pins may reference types outside the enabled
 * catalog (disabled, allowlist gap); those still need images so MapLibre can render.
 */
export async function registerCustomPinImages(options: {
  map: MLMap
  catalog: CatalogPinType[]
  /** Slugs present on pins / pending marker (may not be in `catalog`). */
  pinTypeSlugs?: PinType[]
  knownCustomImageIds: Set<string>
  customImageVisualKeys: Map<string, string>
  isCancelled: () => boolean
}): Promise<{
  knownCustomImageIds: Set<string>
  customImageVisualKeys: Map<string, string>
} | null> {
  const { map, catalog, isCancelled } = options
  const nextIds = new Set<string>()
  const nextVisualKeys = new Map<string, string>()

  const catalogBySlug = new Map(
    catalog.map((row) => [pinTypeSlug(row), row] as const).filter(([slug]) => slug !== ""),
  )

  const slugs = new Set<string>()
  for (const row of catalog) {
    const slug = pinTypeSlug(row)
    if (slug) slugs.add(slug)
  }
  for (const slug of options.pinTypeSlugs ?? []) {
    if (slug) slugs.add(slug)
  }

  for (const slug of slugs) {
    const row = catalogBySlug.get(slug)
    const visualKey = `${row?.marker_color ?? ""}:${row?.icon ?? ""}`
    for (const outline of [undefined, "new", "selected"] as const) {
      const imageId = getPinTypeMarkerImageId(slug, outline)
      nextIds.add(imageId)
      nextVisualKeys.set(imageId, visualKey)
      const visualChanged = options.customImageVisualKeys.get(imageId) !== visualKey
      if (map.hasImage(imageId) && !visualChanged) continue
      try {
        const dataUrl = createPinTypeMarkerSVG(slug, catalog, outline)
        const img = await loadImage(dataUrl)
        if (isCancelled()) return null
        if (map.hasImage(imageId)) map.removeImage(imageId)
        map.addImage(imageId, img)
      } catch {
        // ignore failed custom marker images
      }
    }
  }

  if (isCancelled()) return null

  for (const imageId of options.knownCustomImageIds) {
    if (!nextIds.has(imageId) && map.hasImage(imageId)) {
      map.removeImage(imageId)
    }
  }

  return {
    knownCustomImageIds: nextIds,
    customImageVisualKeys: nextVisualKeys,
  }
}
