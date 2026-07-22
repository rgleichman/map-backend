import type maplibregl from "maplibre-gl"
import type { CustomPinType, Pin, PinType } from "../../types"
import {
  getPinTypeMarkerImageId,
  resolvePinTypeConfig,
  SELECTED_PIN_OUTLINE_STROKE,
  type PinMarkerMapOutline,
} from "../../utils/pinTypeIcons"
import { isPinNewSince } from "../../utils/mapLastVisit"
import { pinMapGeoJsonSyncPart, type PinFilterMatcher } from "./filters"

export type PinFeatureProperties = {
  pin_id: number
  title: string
  pin_type: PinType
  pin_type_icon: string
  haloColor: string
  haloWidth: number
  /** True when the pin is new since the viewer’s last visit. */
  isNew: boolean
  /** True when this pin is open in the detail panel. */
  isSelected: boolean
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

export const PIN_LABEL_HALO_WIDTH = 1.7
export const PIN_LABEL_SELECTED_HALO_WIDTH = 3

export const CLUSTER_RADIUS_PX = 16
/** Stop clustering above this zoom so pin labels can render on individual features. */
export const CLUSTER_MAX_ZOOM = 10

/** Opacity for pins that do not match the active filters (still visible and clickable). */
export const FILTER_DIMMED_OPACITY = 0.25

export const DIMMED_SOURCE_ID = "pin-features-dimmed"

export const pinLabelsVisibleFilter: maplibregl.FilterSpecification = ["!", ["has", "point_count"]]

/** Unclustered pins that are not the current selection (selection uses its own top layer). */
export const pinIconsUnselectedFilter: maplibregl.FilterSpecification = [
  "all",
  ["!", ["has", "point_count"]],
  ["!", ["boolean", ["get", "isSelected"], false]],
]

export const pinIconsSelectedFilter: maplibregl.FilterSpecification = [
  "all",
  ["!", ["has", "point_count"]],
  ["boolean", ["get", "isSelected"], false],
]

export const PIN_ICONS_SELECTED_LAYER_ID = "pin-icons-selected-layer"

/** Selected pins sort above others so the highlighted marker paints on top. */
export const pinIconLayout: maplibregl.SymbolLayerSpecification["layout"] = {
  "icon-image": ["get", "pin_type_icon"],
  "icon-size": 1,
  "icon-anchor": "bottom",
  "icon-allow-overlap": true,
  "icon-ignore-placement": true,
  "symbol-sort-key": ["case", ["boolean", ["get", "isSelected"], false], 1, 0],
}

/** Pin title labels — always drawn; nearby titles are blanked in GeoJSON when a pin is selected. */
export const pinLabelLayout: maplibregl.SymbolLayerSpecification["layout"] = {
  "text-field": ["get", "title"],
  "text-font": ["Open Sans Bold", "sans-serif"],
  "text-size": 14,
  "text-anchor": "top",
  "text-offset": [0, 0],
  "text-allow-overlap": true,
  "text-ignore-placement": true,
}

/** Screen-space half-size used to hide labels that would collide with the selected pin’s title. */
export const SELECTED_LABEL_HIDE_HALF_WIDTH_PX = 100
export const SELECTED_LABEL_HIDE_HALF_HEIGHT_PX = 36

type ProjectFn = (lng: number, lat: number) => { x: number; y: number }

/**
 * Clear titles of non-selected pins whose labels would overlap the selected pin’s label on screen.
 */
export function suppressOverlappingPinLabels(
  features: PinPointFeature[],
  selectedPinId: number | null,
  project: ProjectFn,
): PinPointFeature[] {
  if (selectedPinId == null) return features
  const selected = features.find((f) => f.properties.pin_id === selectedPinId)
  if (!selected) return features

  const [selLng, selLat] = selected.geometry.coordinates
  const sel = project(selLng, selLat)

  return features.map((feature) => {
    if (feature.properties.pin_id === selectedPinId) return feature
    if (feature.properties.title === "") return feature

    const [lng, lat] = feature.geometry.coordinates
    const p = project(lng, lat)
    const overlaps =
      Math.abs(p.x - sel.x) < SELECTED_LABEL_HIDE_HALF_WIDTH_PX &&
      Math.abs(p.y - sel.y) < SELECTED_LABEL_HIDE_HALF_HEIGHT_PX
    if (!overlaps) return feature

    return {
      ...feature,
      properties: { ...feature.properties, title: "" },
    }
  })
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

function mapOutlineForPin(isSelected: boolean, isNew: boolean): PinMarkerMapOutline | undefined {
  if (isSelected) return "selected"
  if (isNew) return "new"
  return undefined
}

export function toPinFeature(
  pin: Pin,
  catalog: CustomPinType[],
  lastVisitWatermark: Date | null = null,
  selectedPinId: number | null = null,
): PinPointFeature {
  const pinColor = resolvePinTypeConfig(pin.pin_type, catalog).color
  const isNew = isPinNewSince(pin, lastVisitWatermark)
  const isSelected = selectedPinId != null && pin.id === selectedPinId
  const title = isSelected ? pin.title.trim() : truncateTitle(pin.title)
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [pin.longitude, pin.latitude] },
    properties: {
      pin_id: pin.id,
      title,
      pin_type: pin.pin_type,
      pin_type_icon: getPinTypeMarkerImageId(pin.pin_type, mapOutlineForPin(isSelected, isNew)),
      haloColor: isSelected ? SELECTED_PIN_OUTLINE_STROKE : desaturateHex(pinColor),
      haloWidth: isSelected ? PIN_LABEL_SELECTED_HALO_WIDTH : PIN_LABEL_HALO_WIDTH,
      isNew,
      isSelected,
    },
  }
}

export function buildPinFeatureSets(
  pinList: Pin[],
  pinMatches: PinFilterMatcher,
  catalog: CustomPinType[],
  lastVisitWatermark: Date | null = null,
  selectedPinId: number | null = null,
): PinFeatureSets {
  const matching: PinPointFeature[] = []
  const dimmed: PinPointFeature[] = []
  for (const pin of pinList) {
    const feature = toPinFeature(pin, catalog, lastVisitWatermark, selectedPinId)
    if (pinMatches(pin)) matching.push(feature)
    else dimmed.push(feature)
  }
  return { matching, dimmed }
}

/** Stable key so we skip redundant GeoJSON setData when nothing map-visible changed. */
export function buildPinGeoJsonSyncKey(
  pins: Pin[],
  filterSyncKey: string,
  catalog: CustomPinType[],
  lastVisitWatermarkMs: number | null = null,
  selectedPinId: number | null = null,
): string {
  const pinParts = pins.map(pinMapGeoJsonSyncPart)
  const catalogParts = catalog.map(
    (c) => `${c.id}:${c.pin_type}:${c.marker_color ?? ""}:${c.icon ?? ""}`,
  )
  return `${pinParts.join("|")}::${filterSyncKey}::${catalogParts.join("|")}::lv:${lastVisitWatermarkMs ?? "none"}::sel:${selectedPinId ?? "none"}`
}
