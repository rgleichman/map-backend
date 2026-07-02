import type { LineLayerSpecification } from "maplibre-gl"
import type { CustomPinType, Pin, PinLink } from "../../types"
import { pinMapGeoJsonSyncPart, type PinFilterMatcher } from "./filters"

export const PIN_LINKS_SOURCE_ID = "pin-links"
export const PIN_LINKS_LAYER_ID = "pin-links-layer"
export const PIN_LINKS_GLOBAL_MAX = 80

export const SHOW_CONNECTIONS_STORAGE_KEY = "mapgarden:showPinConnectionsV1"

export type PinLinkFeatureProperties = {
  source_pin_id: number
  target_pin_id: number
  explicit: boolean
  highlighted: boolean
  edge_key: string
}

export type PinLinkLineFeature = {
  type: "Feature"
  geometry: { type: "LineString"; coordinates: [number, number][] }
  properties: PinLinkFeatureProperties
}

export type PinLinkFeatureCollection = {
  type: "FeatureCollection"
  features: PinLinkLineFeature[]
}

export type BuildPinLinkGeoJsonParams = {
  pins: Pin[]
  catalog: CustomPinType[]
  focusPinId: number | null
  backlinks: PinLink[] | null
  showConnections: boolean
  /** When set, global mode only draws edges between pins that pass the map filter. */
  pinMatches?: PinFilterMatcher
  filterSyncKey: string
}

export type PinLinkGeoJsonResult = {
  featureCollection: PinLinkFeatureCollection
  globalCapped: boolean
}

export function readShowConnectionsPreference(): boolean {
  try {
    return window.localStorage.getItem(SHOW_CONNECTIONS_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

export function writeShowConnectionsPreference(show: boolean): void {
  try {
    window.localStorage.setItem(SHOW_CONNECTIONS_STORAGE_KEY, show ? "1" : "0")
  } catch {
    // ignore quota / private mode
  }
}

export function undirectedEdgeKey(idA: number, idB: number): string {
  const lo = Math.min(idA, idB)
  const hi = Math.max(idA, idB)
  return `${lo}-${hi}`
}

function isExplicitLink(link: PinLink): boolean {
  return link.source_field == null
}

function emptyResult(globalCapped = false): PinLinkGeoJsonResult {
  return {
    featureCollection: { type: "FeatureCollection", features: [] },
    globalCapped,
  }
}

type RawEdge = {
  sourceId: number
  targetId: number
  explicit: boolean
}

function collectGlobalEdges(pins: Pin[], pinMatches: PinFilterMatcher): RawEdge[] {
  const pinsById = new Map(pins.map((p) => [p.id, p]))
  const edges: RawEdge[] = []
  const seen = new Set<string>()

  for (const pin of pins) {
    for (const link of pin.linked_pins ?? []) {
      const target = pinsById.get(link.pin_id)
      if (!target) continue
      if (!pinMatches(pin)) continue
      if (!pinMatches(target)) continue

      const key = undirectedEdgeKey(pin.id, target.id)
      if (seen.has(key)) continue
      seen.add(key)
      edges.push({ sourceId: pin.id, targetId: target.id, explicit: isExplicitLink(link) })
    }
  }

  return edges
}

function collectFocusEdges(
  pins: Pin[],
  focusPinId: number,
  backlinks: PinLink[] | null,
): RawEdge[] {
  const pinsById = new Map(pins.map((p) => [p.id, p]))
  const focusPin = pinsById.get(focusPinId)
  if (!focusPin) return []

  const edges: RawEdge[] = []
  const seen = new Set<string>()

  const addEdge = (sourceId: number, targetId: number, explicit: boolean) => {
    if (sourceId !== focusPinId && targetId !== focusPinId) return
    if (!pinsById.has(sourceId) || !pinsById.has(targetId)) return

    const key = undirectedEdgeKey(sourceId, targetId)
    if (seen.has(key)) return
    seen.add(key)
    edges.push({ sourceId, targetId, explicit })
  }

  for (const link of focusPin.linked_pins ?? []) {
    addEdge(focusPinId, link.pin_id, isExplicitLink(link))
  }

  for (const link of backlinks ?? []) {
    addEdge(link.pin_id, focusPinId, isExplicitLink(link))
  }

  return edges
}

function edgesToFeatures(
  edges: RawEdge[],
  pinsById: Map<number, Pin>,
  focusPinId: number | null,
): PinLinkLineFeature[] {
  return edges.flatMap((edge) => {
    const source = pinsById.get(edge.sourceId)
    const target = pinsById.get(edge.targetId)
    if (!source || !target) return []

    const highlighted =
      focusPinId != null && (edge.sourceId === focusPinId || edge.targetId === focusPinId)

    return [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [source.longitude, source.latitude],
            [target.longitude, target.latitude],
          ],
        },
        properties: {
          source_pin_id: edge.sourceId,
          target_pin_id: edge.targetId,
          explicit: edge.explicit,
          highlighted,
          edge_key: undirectedEdgeKey(edge.sourceId, edge.targetId),
        },
      },
    ]
  })
}

export function buildPinLinkGeoJson(params: BuildPinLinkGeoJsonParams): PinLinkGeoJsonResult {
  const { pins, catalog, focusPinId, backlinks, showConnections, pinMatches } = params

  if (!showConnections) {
    return emptyResult()
  }

  const pinsById = new Map(pins.map((p) => [p.id, p]))
  let edges: RawEdge[]

  if (focusPinId != null) {
    edges = collectFocusEdges(pins, focusPinId, backlinks)
  } else {
    if (!pinMatches) return emptyResult()
    edges = collectGlobalEdges(pins, pinMatches)
    if (edges.length > PIN_LINKS_GLOBAL_MAX) {
      return emptyResult(true)
    }
  }

  return {
    featureCollection: {
      type: "FeatureCollection",
      features: edgesToFeatures(edges, pinsById, focusPinId),
    },
    globalCapped: false,
  }
}

/** Stable key so we skip redundant GeoJSON setData when nothing map-visible changed. */
export function buildPinLinkSyncKey(params: BuildPinLinkGeoJsonParams): string {
  const pinParts = params.pins.map(pinMapGeoJsonSyncPart)
  const linkParts = params.pins.map((p) =>
    JSON.stringify(
      (p.linked_pins ?? []).map((l) => `${l.pin_id}:${l.source_field ?? ""}`).sort(),
    ),
  )
  const catalogParts = params.catalog.map(
    (c) => `${c.id}:${c.pin_type}:${c.marker_color ?? ""}:${c.icon ?? ""}`,
  )
  const backlinkParts = (params.backlinks ?? [])
    .map((l) => `${l.pin_id}:${l.source_field ?? ""}`)
    .sort()
    .join(",")
  return [
    params.showConnections ? "1" : "0",
    String(params.focusPinId ?? ""),
    backlinkParts,
    params.filterSyncKey,
    pinParts.join("|"),
    linkParts.join("|"),
    catalogParts.join("|"),
  ].join("::")
}

export function resolveOtherPinIdFromLink(
  sourcePinId: number,
  targetPinId: number,
  focusPinId: number | null,
): number {
  if (focusPinId != null) {
    if (sourcePinId === focusPinId) return targetPinId
    if (targetPinId === focusPinId) return sourcePinId
  }
  return targetPinId
}

export const pinLinkLinePaint: LineLayerSpecification["paint"] = {
  "line-color": ["case", ["get", "explicit"], "#3b82f6", "#94a3b8"],
  "line-width": ["case", ["get", "highlighted"], 3, 2],
  "line-opacity": [
    "case",
    ["get", "highlighted"],
    0.9,
    ["case", ["get", "explicit"], 0.55, 0.35],
  ],
  "line-dasharray": [
    "case",
    ["get", "explicit"],
    ["literal", [1, 0]],
    ["literal", [2, 2]],
  ],
}
