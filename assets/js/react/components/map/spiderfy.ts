import type * as maplibregl from "maplibre-gl"
import { PIN_FOCUS_ZOOM } from "../../hooks/mapHookTypes"
import type { PinFeatureProperties } from "./mapPinFeatures"

/** Auto-fan small clusters at or above pin-focus zoom. */
export const SPIDERFY_MIN_ZOOM = PIN_FOCUS_ZOOM

/** Above this leaf count, keep the numbered cluster bubble. */
export const SPIDERFY_MAX_COUNT = 8

/** Screen-space ring radius so ~50px discs clear each other. */
export const SPIDERFY_PIXEL_RADIUS = 60

export const SPIDER_LEAVES_SOURCE_ID = "pin-spider-leaves"
export const SPIDER_LEGS_SOURCE_ID = "pin-spider-legs"
export const SPIDER_LEAVES_LAYER_ID = "pin-spider-leaves-layer"
export const SPIDER_LEAVES_SELECTED_LAYER_ID = "pin-spider-leaves-selected-layer"
export const SPIDER_LEAVES_LABELS_LAYER_ID = "pin-spider-leaves-labels-layer"
export const SPIDER_LEGS_LAYER_ID = "pin-spider-legs-layer"

export const SPIDER_LEAF_LAYER_IDS = [
  SPIDER_LEAVES_SELECTED_LAYER_ID,
  SPIDER_LEAVES_LAYER_ID,
  SPIDER_LEAVES_LABELS_LAYER_ID,
] as const

export type SpiderLeafProperties = PinFeatureProperties & {
  /** True geographic longitude (before spider offset). */
  true_longitude: number
  /** True geographic latitude (before spider offset). */
  true_latitude: number
  cluster_id: number
}

export type SpiderLeafFeature = {
  type: "Feature"
  geometry: { type: "Point"; coordinates: [number, number] }
  properties: SpiderLeafProperties
}

export type SpiderLegFeature = {
  type: "Feature"
  geometry: {
    type: "LineString"
    coordinates: [[number, number], [number, number]]
  }
  properties: { cluster_id: number; pin_id: number }
}

export type SpiderfyFeatureSets = {
  leaves: SpiderLeafFeature[]
  legs: SpiderLegFeature[]
  clusterIds: number[]
}

type ProjectFn = (lng: number, lat: number) => { x: number; y: number }
type UnprojectFn = (x: number, y: number) => { lng: number; lat: number }

export function shouldSpiderfyCluster(opts: {
  zoom: number
  pointCount: number
}): boolean {
  const { zoom, pointCount } = opts
  return zoom >= SPIDERFY_MIN_ZOOM && pointCount >= 2 && pointCount <= SPIDERFY_MAX_COUNT
}

/** Slot bearings matching {@link spiderfyOffsets} (radians, screen space, top = -π/2). */
export function spiderfySlotAngles(count: number): number[] {
  if (count <= 0) return []
  if (count === 1) return [0]
  const angles: number[] = []
  for (let i = 0; i < count; i++) {
    angles.push(-Math.PI / 2 + (2 * Math.PI * i) / count)
  }
  return angles
}

/**
 * Evenly spaced screen offsets around the origin, starting at the top.
 * A single leaf stays centered (no offset).
 */
export function spiderfyOffsets(
  count: number,
  pixelRadius: number = SPIDERFY_PIXEL_RADIUS,
): Array<{ x: number; y: number }> {
  if (count <= 0) return []
  if (count === 1) return [{ x: 0, y: 0 }]

  return spiderfySlotAngles(count).map((angle) => ({
    x: Math.cos(angle) * pixelRadius,
    y: Math.sin(angle) * pixelRadius,
  }))
}

/** Smallest absolute difference between two angles in radians. */
export function circularAngleDelta(a: number, b: number): number {
  let d = Math.abs(a - b) % (Math.PI * 2)
  if (d > Math.PI) d = Math.PI * 2 - d
  return d
}

/**
 * Optimal bipartite assignment (Hungarian / Kuhn–Munkres).
 * `cost[row][col]` → returns `slotIndexForRow[row]`.
 */
export function minCostAssignment(cost: number[][]): number[] {
  const n = cost.length
  if (n === 0) return []
  for (const row of cost) {
    if (row.length !== n) {
      throw new Error("minCostAssignment expects a square cost matrix")
    }
  }

  // 1-indexed formulation (CP-algorithms style).
  const u = Array(n + 1).fill(0)
  const v = Array(n + 1).fill(0)
  const p = Array(n + 1).fill(0)
  const way = Array(n + 1).fill(0)

  for (let i = 1; i <= n; i++) {
    p[0] = i
    let j0 = 0
    const minv = Array(n + 1).fill(Infinity)
    const used = Array(n + 1).fill(false)
    do {
      used[j0] = true
      const i0 = p[j0]
      let delta = Infinity
      let j1 = 0
      for (let j = 1; j <= n; j++) {
        if (used[j]) continue
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j]
        if (cur < minv[j]) {
          minv[j] = cur
          way[j] = j0
        }
        if (minv[j] < delta) {
          delta = minv[j]
          j1 = j
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta
          v[j] -= delta
        } else {
          minv[j] -= delta
        }
      }
      j0 = j1
    } while (p[j0] !== 0)
    do {
      const j1 = way[j0]
      p[j0] = p[j1]
      j0 = j1
    } while (j0 !== 0)
  }

  const slotIndexForRow = Array(n).fill(0)
  for (let j = 1; j <= n; j++) {
    if (p[j] !== 0) slotIndexForRow[p[j] - 1] = j - 1
  }
  return slotIndexForRow
}

/**
 * Assign each pin to a unique ring slot minimizing total angular error
 * between the pin’s screen bearing from the cluster center and the slot bearing.
 * Pins exactly on the center (undefined bearing) cost 0 for every slot.
 */
export function assignPinsToSpiderSlots(
  pinScreenOffsets: ReadonlyArray<{ x: number; y: number }>,
): number[] {
  const n = pinScreenOffsets.length
  if (n === 0) return []
  if (n === 1) return [0]

  const slotAngles = spiderfySlotAngles(n)
  const cost = pinScreenOffsets.map((off) => {
    if (off.x === 0 && off.y === 0) return slotAngles.map(() => 0)
    const bearing = Math.atan2(off.y, off.x)
    return slotAngles.map((slotAngle) => circularAngleDelta(bearing, slotAngle))
  })
  return minCostAssignment(cost)
}

/** Cluster-layer filter: all clusters, minus ones currently shown as a spider fan. */
export function clusterFilterExcludingIds(
  clusterIds: readonly number[],
): maplibregl.FilterSpecification {
  if (clusterIds.length === 0) return ["has", "point_count"]
  return [
    "all",
    ["has", "point_count"],
    ["!", ["in", ["get", "cluster_id"], ["literal", [...clusterIds]]]],
  ]
}

export function emptySpiderfyFeatureSets(): SpiderfyFeatureSets {
  return { leaves: [], legs: [], clusterIds: [] }
}

/**
 * Stable key so we skip redundant spider setData when nothing visible changed.
 * Zoom is quantized; center is rounded to avoid float churn.
 */
export function buildSpiderfySyncKey(
  clusterIds: readonly number[],
  zoom: number,
  center: { lng: number; lat: number },
  selectedPinId: number | null,
): string {
  const ids = [...clusterIds].sort((a, b) => a - b).join(",")
  const z = Math.round(zoom * 100) / 100
  const lng = Math.round(center.lng * 1e5) / 1e5
  const lat = Math.round(center.lat * 1e5) / 1e5
  return `${ids}|z:${z}|c:${lng},${lat}|sel:${selectedPinId ?? "none"}`
}

export type ClusterLeafInput = {
  geometry: { type: string; coordinates?: unknown }
  properties?: Record<string, unknown> | null
}

type ParsedSpiderLeaf = {
  pinId: number
  title: string
  pin_type: PinFeatureProperties["pin_type"]
  pin_type_icon: string
  haloColor: string
  haloWidth: number
  isNew: boolean
  isSelected: boolean
  trueLng: number
  trueLat: number
  screenOffset: { x: number; y: number }
}

/**
 * Offset cluster leaves around `center` in screen space and build spoke legs.
 * Slot order uses min-cost angular assignment so markers stay near true bearings.
 */
export function spiderfyLeavesToFeatures(
  leaves: ClusterLeafInput[],
  center: [number, number],
  clusterId: number,
  project: ProjectFn,
  unproject: UnprojectFn,
  pixelRadius: number = SPIDERFY_PIXEL_RADIUS,
): Pick<SpiderfyFeatureSets, "leaves" | "legs"> {
  const centerPt = project(center[0], center[1])
  const parsed: ParsedSpiderLeaf[] = []

  for (const leaf of leaves) {
    const props = leaf.properties
    if (!props) continue

    const pinId = Number(props.pin_id)
    if (!Number.isFinite(pinId)) continue

    const trueCoords = pointCoordinates(leaf)
    const trueLng = trueCoords?.[0] ?? center[0]
    const trueLat = trueCoords?.[1] ?? center[1]
    const truePt = project(trueLng, trueLat)

    parsed.push({
      pinId,
      title: String(props.title ?? ""),
      pin_type: props.pin_type as PinFeatureProperties["pin_type"],
      pin_type_icon: String(props.pin_type_icon ?? ""),
      haloColor: String(props.haloColor ?? "#ffffff"),
      haloWidth: Number(props.haloWidth) || 0,
      isNew: Boolean(props.isNew),
      isSelected: Boolean(props.isSelected),
      trueLng,
      trueLat,
      screenOffset: { x: truePt.x - centerPt.x, y: truePt.y - centerPt.y },
    })
  }

  const offsets = spiderfyOffsets(parsed.length, pixelRadius)
  const slotForPin = assignPinsToSpiderSlots(parsed.map((p) => p.screenOffset))
  const outLeaves: SpiderLeafFeature[] = []
  const outLegs: SpiderLegFeature[] = []

  for (let i = 0; i < parsed.length; i++) {
    const leaf = parsed[i]
    const offset = offsets[slotForPin[i]] ?? { x: 0, y: 0 }
    const display = unproject(centerPt.x + offset.x, centerPt.y + offset.y)
    const displayCoords: [number, number] = [display.lng, display.lat]

    outLeaves.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: displayCoords },
      properties: {
        pin_id: leaf.pinId,
        title: leaf.title,
        pin_type: leaf.pin_type,
        pin_type_icon: leaf.pin_type_icon,
        haloColor: leaf.haloColor,
        haloWidth: leaf.haloWidth,
        isNew: leaf.isNew,
        isSelected: leaf.isSelected,
        true_longitude: leaf.trueLng,
        true_latitude: leaf.trueLat,
        cluster_id: clusterId,
      },
    })

    outLegs.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        // Spoke from the fanned marker back to this pin’s true location (not cluster center).
        coordinates: [displayCoords, [leaf.trueLng, leaf.trueLat]],
      },
      properties: { cluster_id: clusterId, pin_id: leaf.pinId },
    })
  }

  return { leaves: outLeaves, legs: outLegs }
}

function pointCoordinates(feature: ClusterLeafInput): [number, number] | null {
  if (feature.geometry.type !== "Point") return null
  const coords = feature.geometry.coordinates
  if (!Array.isArray(coords) || coords.length < 2) return null
  const lng = Number(coords[0])
  const lat = Number(coords[1])
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
  return [lng, lat]
}

/** Apply selected-pin label suppression using display coordinates. */
export function suppressOverlappingSpiderLabels(
  leaves: SpiderLeafFeature[],
  selectedPinId: number | null,
  project: ProjectFn,
  halfWidthPx: number,
  halfHeightPx: number,
): SpiderLeafFeature[] {
  if (selectedPinId == null) return leaves
  const selected = leaves.find((f) => f.properties.pin_id === selectedPinId)
  if (!selected) return leaves

  const [selLng, selLat] = selected.geometry.coordinates
  const sel = project(selLng, selLat)

  return leaves.map((feature) => {
    if (feature.properties.pin_id === selectedPinId) return feature
    if (feature.properties.title === "") return feature

    const [lng, lat] = feature.geometry.coordinates
    const p = project(lng, lat)
    const overlaps =
      Math.abs(p.x - sel.x) < halfWidthPx && Math.abs(p.y - sel.y) < halfHeightPx
    if (!overlaps) return feature

    return {
      ...feature,
      properties: { ...feature.properties, title: "" },
    }
  })
}

/** MapLibre symbol filters for spider leaf icon layers. */
export const spiderLeavesUnselectedFilter: maplibregl.FilterSpecification = [
  "!",
  ["boolean", ["get", "isSelected"], false],
]

export const spiderLeavesSelectedFilter: maplibregl.FilterSpecification = [
  "boolean",
  ["get", "isSelected"],
  false,
]
