import * as api from "./api/client"
import type { BuiltinPinType, CustomPinType, Pin, SubMap } from "./types"
import { BUILTIN_PIN_TYPES } from "./utils/builtinPinType"

export type MapData = {
  pins: Pin[]
  subMap: SubMap | null
  customPinTypes: CustomPinType[]
  enabledBuiltinTypes: BuiltinPinType[]
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
      customPinTypes: subMap.available_custom_pin_types ?? [],
      enabledBuiltinTypes: subMap.enabled_builtin_pin_types ?? BUILTIN_PIN_TYPES,
    }
  }

  const [pinsRes, typesRes] = await Promise.all([api.getPins(), api.getPinTypes()])
  return {
    pins: pinsRes.data,
    subMap: null,
    customPinTypes: typesRes.data,
    enabledBuiltinTypes: BUILTIN_PIN_TYPES,
  }
}
