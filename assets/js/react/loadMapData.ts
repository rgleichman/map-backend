import * as api from "./api/client"
import type { Pin, SubMap } from "./types"

export type MapData = {
  pins: Pin[]
  subMap: SubMap | null
}

/** Load pins and optional sub-map metadata for world or community map. */
export async function loadMapData(communityUrl?: string): Promise<MapData> {
  if (communityUrl) {
    const [meta, pinList] = await Promise.all([
      api.getSubMap(communityUrl),
      api.getSubMapPins(communityUrl),
    ])
    return {
      pins: pinList.data,
      subMap: meta.data,
    }
  }

  const { data } = await api.getPins()
  return { pins: data, subMap: null }
}
