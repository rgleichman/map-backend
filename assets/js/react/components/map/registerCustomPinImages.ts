import type { Map as MLMap } from "maplibre-gl"
import type { CustomPinType } from "../../types"
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
 * Register custom marker images (normal + new + selected) on the map.
 * Updates known/visual-key tracking; caller should sync GeoJSON after.
 */
export async function registerCustomPinImages(options: {
  map: MLMap
  catalog: CustomPinType[]
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

  for (const pinType of catalog) {
    const visualKey = `${pinType.marker_color ?? ""}:${pinType.icon ?? ""}`
    for (const outline of [undefined, "new", "selected"] as const) {
      const imageId = getPinTypeMarkerImageId(pinType.pin_type, outline)
      nextIds.add(imageId)
      nextVisualKeys.set(imageId, visualKey)
      const visualChanged = options.customImageVisualKeys.get(imageId) !== visualKey
      if (map.hasImage(imageId) && !visualChanged) continue
      try {
        const dataUrl = createPinTypeMarkerSVG(pinType.pin_type, catalog, outline)
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
