import type * as maplibregl from "maplibre-gl"
import { CLUSTER_LAYER_IDS, MATCHING_SOURCE_ID } from "./clusterInteraction"
import {
  pinIconLayout,
  pinLabelLayout,
  SELECTED_LABEL_HIDE_HALF_HEIGHT_PX,
  SELECTED_LABEL_HIDE_HALF_WIDTH_PX,
} from "./mapPinFeatures"
import {
  buildSpiderfySyncKey,
  clusterFilterExcludingIds,
  emptySpiderfyFeatureSets,
  shouldSpiderfyCluster,
  SPIDER_LEAVES_LABELS_LAYER_ID,
  SPIDER_LEAVES_LAYER_ID,
  SPIDER_LEAVES_SELECTED_LAYER_ID,
  SPIDER_LEAVES_SOURCE_ID,
  SPIDER_LEGS_LAYER_ID,
  SPIDER_LEGS_SOURCE_ID,
  SPIDERFY_MIN_ZOOM,
  spiderfyLeavesToFeatures,
  spiderLeavesSelectedFilter,
  spiderLeavesUnselectedFilter,
  suppressOverlappingSpiderLabels,
  type SpiderfyFeatureSets,
} from "./spiderfy"

export type SpiderfyOverlayState = {
  lastSyncKey: string
  generation: number
}

export function createSpiderfyOverlayState(): SpiderfyOverlayState {
  return { lastSyncKey: "", generation: 0 }
}

/** Drop cached sync key so the next sync writes (e.g. after pan/zoom). */
export function bumpSpiderfyOverlaySync(state: SpiderfyOverlayState): void {
  state.lastSyncKey = ""
}

/** Invalidate in-flight syncs and cached key (map scope change / unmount). */
export function resetSpiderfyOverlayState(state: SpiderfyOverlayState): void {
  state.lastSyncKey = ""
  state.generation += 1
}

function spiderSourcesReady(map: maplibregl.Map): boolean {
  return Boolean(
    map.getSource(SPIDER_LEAVES_SOURCE_ID) && map.getSource(SPIDER_LEGS_SOURCE_ID),
  )
}

/**
 * Immediately empty spider sources and restore default cluster filters.
 * Forces a write even when the sync key would otherwise match.
 */
export function clearSpiderfyOverlay(
  map: maplibregl.Map,
  state: SpiderfyOverlayState,
  selectedPinId: number | null = null,
): void {
  if (!spiderSourcesReady(map)) return
  state.lastSyncKey = ""
  applySpiderfyFeatureSets(map, state, emptySpiderfyFeatureSets(), selectedPinId)
}

const EMPTY_FEATURE_COLLECTION = {
  type: "FeatureCollection" as const,
  features: [],
}

/** Add spider leaf/leg GeoJSON sources and symbol/line layers (above selected pin icons). */
export function addSpiderfySourcesAndLayers(map: maplibregl.Map): void {
  map.addSource(SPIDER_LEAVES_SOURCE_ID, {
    type: "geojson",
    data: EMPTY_FEATURE_COLLECTION,
  })
  map.addSource(SPIDER_LEGS_SOURCE_ID, {
    type: "geojson",
    data: EMPTY_FEATURE_COLLECTION,
  })
  map.addLayer({
    id: SPIDER_LEGS_LAYER_ID,
    type: "line",
    source: SPIDER_LEGS_SOURCE_ID,
    paint: {
      "line-color": "#64748b",
      "line-width": 1.5,
      "line-opacity": 0.55,
    },
  })
  map.addLayer({
    id: SPIDER_LEAVES_LAYER_ID,
    type: "symbol",
    source: SPIDER_LEAVES_SOURCE_ID,
    filter: spiderLeavesUnselectedFilter,
    layout: pinIconLayout,
  })
  map.addLayer({
    id: SPIDER_LEAVES_LABELS_LAYER_ID,
    type: "symbol",
    source: SPIDER_LEAVES_SOURCE_ID,
    layout: pinLabelLayout,
    paint: {
      "text-color": "#1f2937",
      "text-halo-color": ["get", "haloColor"],
      "text-halo-width": ["get", "haloWidth"],
    },
  })
  map.addLayer({
    id: SPIDER_LEAVES_SELECTED_LAYER_ID,
    type: "symbol",
    source: SPIDER_LEAVES_SOURCE_ID,
    filter: spiderLeavesSelectedFilter,
    layout: pinIconLayout,
  })
}

export function applySpiderfyFeatureSets(
  map: maplibregl.Map,
  state: SpiderfyOverlayState,
  sets: SpiderfyFeatureSets,
  selectedPinId: number | null,
): void {
  if (!spiderSourcesReady(map)) return

  const center = map.getCenter()
  const syncKey = buildSpiderfySyncKey(
    sets.clusterIds,
    map.getZoom(),
    { lng: center.lng, lat: center.lat },
    selectedPinId,
  )
  if (syncKey === state.lastSyncKey) return
  state.lastSyncKey = syncKey

    ; (map.getSource(SPIDER_LEAVES_SOURCE_ID) as maplibregl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features: sets.leaves,
    })
    ; (map.getSource(SPIDER_LEGS_SOURCE_ID) as maplibregl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features: sets.legs,
    })

  const clusterFilter = clusterFilterExcludingIds(sets.clusterIds)
  for (const layerId of CLUSTER_LAYER_IDS) {
    if (map.getLayer(layerId)) map.setFilter(layerId, clusterFilter)
  }
}

/**
 * Query clustered pins, spiderfy small groups when zoomed in, and hide those cluster bubbles.
 * Safe to call concurrently — stale generations exit without writing.
 */
export async function syncSpiderfyOverlay(
  map: maplibregl.Map,
  state: SpiderfyOverlayState,
  opts: { selectedPinId: number | null },
): Promise<void> {
  const generation = ++state.generation
  const zoom = map.getZoom()
  if (zoom < SPIDERFY_MIN_ZOOM) {
    clearSpiderfyOverlay(map, state, opts.selectedPinId)
    return
  }

  const source = map.getSource(MATCHING_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
  if (!source) {
    // Matching source gone (teardown/reinit) — don't leave a stale spider fan or exclusions.
    clearSpiderfyOverlay(map, state, opts.selectedPinId)
    return
  }

  const clustersById = new Map<
    number,
    { clusterId: number; pointCount: number; coordinates: [number, number] }
  >()
  for (const feature of map.querySourceFeatures(MATCHING_SOURCE_ID, {
    filter: ["has", "point_count"],
  })) {
    const clusterId = feature.properties?.cluster_id as number | undefined
    const pointCount = feature.properties?.point_count as number | undefined
    if (clusterId == null || pointCount == null) continue
    if (clustersById.has(clusterId)) continue
    if (feature.geometry.type !== "Point") continue
    const coordinates = feature.geometry.coordinates as [number, number]
    clustersById.set(clusterId, { clusterId, pointCount, coordinates })
  }

  const project = (lng: number, lat: number) => map.project([lng, lat])
  const unproject = (x: number, y: number) => {
    const ll = map.unproject([x, y])
    return { lng: ll.lng, lat: ll.lat }
  }

  const sets: SpiderfyFeatureSets = emptySpiderfyFeatureSets()
  for (const cluster of clustersById.values()) {
    if (!shouldSpiderfyCluster({ zoom, pointCount: cluster.pointCount })) continue
    let leaves: Awaited<ReturnType<maplibregl.GeoJSONSource["getClusterLeaves"]>>
    try {
      leaves = await source.getClusterLeaves(cluster.clusterId, cluster.pointCount, 0)
    } catch (err) {
      console.warn("Cluster leaves lookup failed", err)
      continue
    }
    if (generation !== state.generation) return

    const spider = spiderfyLeavesToFeatures(
      leaves,
      cluster.coordinates,
      cluster.clusterId,
      project,
      unproject,
    )
    // Don't hide the cluster bubble unless we actually drew at least one leaf.
    if (spider.leaves.length === 0) continue

    sets.leaves.push(...spider.leaves)
    sets.legs.push(...spider.legs)
    sets.clusterIds.push(cluster.clusterId)
  }

  if (generation !== state.generation) return

  sets.leaves = suppressOverlappingSpiderLabels(
    sets.leaves,
    opts.selectedPinId,
    project,
    SELECTED_LABEL_HIDE_HALF_WIDTH_PX,
    SELECTED_LABEL_HIDE_HALF_HEIGHT_PX,
  )
  applySpiderfyFeatureSets(map, state, sets, opts.selectedPinId)
}
