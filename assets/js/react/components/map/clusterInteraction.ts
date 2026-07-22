import type maplibregl from "maplibre-gl"

export const MATCHING_SOURCE_ID = "pin-features-matching"

export const CLUSTER_LAYER_IDS = ["pin-cluster-count-layer", "pin-clusters-layer"] as const
export const PIN_INTERACTIVE_LAYER_IDS = [
  ...CLUSTER_LAYER_IDS,
  "pin-icons-selected-layer",
  "pin-icons-layer",
  "pin-icons-dimmed-layer",
] as const

export const CLUSTER_EXPANSION_DURATION_MS = 350

export type InteractiveMapFeature = {
  geometry: { type: string; coordinates?: unknown }
  properties?: Record<string, unknown>
  layer: { id: string }
}

export type HitTestMap = Pick<maplibregl.Map, "queryRenderedFeatures">

export type ClusterExpansionSource = {
  getClusterExpansionZoom: (clusterId: number) => Promise<number>
}

export type ClusterExpansionMap = HitTestMap & Pick<maplibregl.Map, "easeTo">

export function isClusterLayerId(layerId: string): boolean {
  return layerId === "pin-clusters-layer" || layerId === "pin-cluster-count-layer"
}

export function topInteractiveFeatureAt(map: HitTestMap, point: maplibregl.PointLike) {
  return map.queryRenderedFeatures(point, { layers: [...PIN_INTERACTIVE_LAYER_IDS] })[0]
}

/** Returns the topmost pin id at a point, or null if a cluster (or nothing) is on top. */
export function pinIdFromTopFeatureAt(map: HitTestMap, point: maplibregl.PointLike): number | null {
  const top = topInteractiveFeatureAt(map, point)
  if (!top || isClusterLayerId(top.layer.id)) return null
  const pinId = top.properties?.pin_id as number | undefined
  return pinId ?? null
}

/**
 * Expands a cluster at the click point when the topmost interactive feature is a cluster.
 * Returns true when a cluster feature was hit (even if expansion could not run).
 */
export async function expandClusterAtPoint(
  map: ClusterExpansionMap,
  point: maplibregl.PointLike,
  source: ClusterExpansionSource,
): Promise<boolean> {
  const top = topInteractiveFeatureAt(map, point)
  if (!top || !isClusterLayerId(top.layer.id)) return false

  const clusterId = top.properties?.cluster_id as number | undefined
  if (clusterId == null) return true

  try {
    const zoom = await source.getClusterExpansionZoom(clusterId)
    const coords = top.geometry.type === "Point" ? top.geometry.coordinates : null
    if (!coords) return true
    map.easeTo({
      center: coords as [number, number],
      zoom,
      duration: CLUSTER_EXPANSION_DURATION_MS,
    })
  } catch (err) {
    console.warn("Cluster expansion zoom failed", err)
  }

  return true
}
