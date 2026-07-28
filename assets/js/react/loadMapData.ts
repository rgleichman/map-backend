import * as api from "./api/client"
import type { CatalogPinType, Pin, SubMap } from "./types"

export type MapData = {
  pins: Pin[]
  /** Pin types enabled on this map (may be empty until types exist). */
  pinTypes: CatalogPinType[]
  subMap: SubMap | null
}

/** Load pins and optional sub-map metadata for world or community map. */
export async function loadMapData(communityUrl?: string): Promise<MapData> {
  if (communityUrl) {
    const [meta, pinList] = await Promise.all([
      api.getSubMap(communityUrl),
      api.getSubMapPins(communityUrl),
    ])
    const subMap = meta.data
    return {
      pins: pinList.data,
      subMap,
      pinTypes: subMap.enabled_pin_types ?? [],
    }
  }

  const [pinsRes, typesRes] = await Promise.all([api.getPins(), api.getPinTypes()])
  return {
    pins: pinsRes.data,
    subMap: null,
    pinTypes: typesRes.data,
  }
}
