import * as api from "./api/client"
import type { CatalogPinType, Pin, SubMap } from "./types"

export type MapCatalog = {
  /** Pin types enabled on this map (may be empty until types exist). */
  pinTypes: CatalogPinType[]
  subMap: SubMap | null
}

export type MapData = MapCatalog & {
  pins: Pin[]
}

const OVERLAY_CLOSE_EVENT = "map:overlay-close"

/** Fetch catalog metadata only (no pin list). Safe to call after overlay close. */
export async function loadMapCatalog(communityUrl?: string): Promise<MapCatalog> {
  if (communityUrl) {
    const { data: subMap } = await api.getSubMap(communityUrl)
    return {
      subMap,
      pinTypes: subMap.enabled_pin_types ?? [],
    }
  }

  const typesRes = await api.getPinTypes()
  return {
    subMap: null,
    pinTypes: typesRes.data,
  }
}

/** Load pins and optional sub-map metadata for world or community map. */
export async function loadMapData(communityUrl?: string): Promise<MapData> {
  if (communityUrl) {
    const [catalog, pinList] = await Promise.all([
      loadMapCatalog(communityUrl),
      api.getSubMapPins(communityUrl),
    ])
    return {
      pins: pinList.data,
      subMap: catalog.subMap,
      pinTypes: catalog.pinTypes,
    }
  }

  const [pinsRes, catalog] = await Promise.all([api.getPins(), loadMapCatalog()])
  return {
    pins: pinsRes.data,
    subMap: catalog.subMap,
    pinTypes: catalog.pinTypes,
  }
}

/** Bind a catalog refresh to overlay close. Returns an unbind function. */
export function bindCatalogRefreshOnOverlayClose(
  refresh: () => void | Promise<void>,
): () => void {
  const onClose = () => {
    void refresh()
  }
  window.addEventListener(OVERLAY_CLOSE_EVENT, onClose)
  return () => window.removeEventListener(OVERLAY_CLOSE_EVENT, onClose)
}
