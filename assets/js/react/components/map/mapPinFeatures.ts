import type maplibregl from "maplibre-gl"
import type { CustomPinType, Pin, PinType } from "../../types"
import { getPinTypeMarkerImageId, resolvePinTypeConfig } from "../../utils/pinTypeIcons"
import { pinMapGeoJsonSyncPart, pinMatchesFilter, type FilterState } from "./filters"

export type PinFeatureProperties = {
  pin_id: number
  title: string
  pin_type: PinType
  pin_type_icon: string
  haloColor: string
}

export type PinPointFeature = {
  type: "Feature"
  geometry: { type: "Point"; coordinates: [number, number] }
  properties: PinFeatureProperties
}

export type PinFeatureSets = {
  matching: PinPointFeature[]
  dimmed: PinPointFeature[]
}

export const PIN_LABEL_MAX_LEN = 22

export const CLUSTER_RADIUS_PX = 16
/** Stop clustering above this zoom so pin labels can render on individual features. */
export const CLUSTER_MAX_ZOOM = 10

/** Opacity for pins that do not match the active filters (still visible and clickable). */
export const FILTER_DIMMED_OPACITY = 0.25

export const DIMMED_SOURCE_ID = "pin-features-dimmed"

export const pinLabelsVisibleFilter: maplibregl.FilterSpecification = ["!", ["has", "point_count"]]

export const pinIconLayout: maplibregl.SymbolLayerSpecification["layout"] = {
  "icon-image": ["get", "pin_type_icon"],
  "icon-size": 1,
  "icon-anchor": "bottom",
  "icon-allow-overlap": true,
  "icon-ignore-placement": true,
}

export function truncateTitle(title: string, max = PIN_LABEL_MAX_LEN): string {
  const t = title.trim()
  if (t.length <= max) return t
  return t.slice(0, max - 1) + "…"
}

/** Blend hex color with white for a desaturated halo that stays readable. */
export function desaturateHex(hex: string, whiteRatio = 0.85): string {
  const n = hex.slice(1)
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  const wr = Math.round(whiteRatio * 255 + (1 - whiteRatio) * r)
  const wg = Math.round(whiteRatio * 255 + (1 - whiteRatio) * g)
  const wb = Math.round(whiteRatio * 255 + (1 - whiteRatio) * b)
  return `#${wr.toString(16).padStart(2, "0")}${wg.toString(16).padStart(2, "0")}${wb.toString(16).padStart(2, "0")}`
}

export function toPinFeature(pin: Pin, catalog: CustomPinType[]): PinPointFeature {
  const pinColor = resolvePinTypeConfig(pin.pin_type, catalog).color
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [pin.longitude, pin.latitude] },
    properties: {
      pin_id: pin.id,
      title: truncateTitle(pin.title),
      pin_type: pin.pin_type,
      pin_type_icon: getPinTypeMarkerImageId(pin.pin_type),
      haloColor: desaturateHex(pinColor),
    },
  }
}

export function buildPinFeatureSets(
  pinList: Pin[],
  filterState: FilterState,
  catalog: CustomPinType[],
): PinFeatureSets {
  const matching: PinPointFeature[] = []
  const dimmed: PinPointFeature[] = []
  for (const pin of pinList) {
    const feature = toPinFeature(pin, catalog)
    if (pinMatchesFilter(pin, filterState, catalog, pinList)) matching.push(feature)
    else dimmed.push(feature)
  }
  return { matching, dimmed }
}

/** Stable key so we skip redundant GeoJSON setData when nothing map-visible changed. */
export function buildPinGeoJsonSyncKey(
  pins: Pin[],
  filterState: FilterState,
  catalog: CustomPinType[],
): string {
  const pinParts = pins.map(pinMapGeoJsonSyncPart)
  const catalogParts = catalog.map(
    (c) => `${c.id}:${c.pin_type}:${c.marker_color ?? ""}:${c.icon ?? ""}`,
  )
  return `${pinParts.join("|")}::${JSON.stringify(filterState)}::${catalogParts.join("|")}`
}
