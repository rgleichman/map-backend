import React, { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import maplibregl, { Map as MLMap, Marker, Popup } from "maplibre-gl"
import type { Pin, PinType } from "../types"
import { BUILTIN_PIN_TYPES, DEFAULT_BUILTIN_PIN_TYPE } from "../utils/builtinPinType"
import {
  createPinTypeMarkerElement,
  createPinTypeMarkerSVG,
  getPinTypeMarkerImageId,
  resolvePinTypeConfig,
} from "../utils/pinTypeIcons"
import type { CustomPinType } from "../types"
import { PinTypesProvider, usePinTypes } from "../context/PinTypesContext"
import { MapLibreSearchControl } from "@stadiamaps/maplibre-search-box";
import { CLEARED_FILTER, pinMatchesFilter, type FilterState } from "./map/filters"
import {
  expandClusterAtPoint,
  MATCHING_SOURCE_ID,
  pinIdFromTopFeatureAt,
  PIN_INTERACTIVE_LAYER_IDS,
} from "./map/clusterInteraction"
import PopupContent from "./map/PopupContent"
import MapFilters from "./MapFilters"
import PinSearch from "./PinSearch"
import { mapShellTopLeftPinSearchTop, mapShellTopRightOverlayTop } from "../utils/siteLayout"
import { communityUrlFromTag, pinMapUrl } from "../utils/pinMapUrl"

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Failed to load pin image"))
    img.src = dataUrl
  })
}

const PIN_LABEL_MAX_LEN = 22

const CLUSTER_RADIUS_PX = 16
/** Stop clustering above this zoom so pin labels can render on individual features. */
const CLUSTER_MAX_ZOOM = 10
const GEOLOCATE_MAX_ZOOM = 12
const PIN_FOCUS_ZOOM = 14
const GEOLOCATE_POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 20 * 60 * 1000,
}

function truncateTitle(title: string, max = PIN_LABEL_MAX_LEN): string {
  const t = title.trim()
  if (t.length <= max) return t
  return t.slice(0, max - 1) + "…"
}

/** Blend hex color with white for a desaturated halo that stays readable. */
function desaturateHex(hex: string, whiteRatio = 0.85): string {
  const n = hex.slice(1)
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  const wr = Math.round(whiteRatio * 255 + (1 - whiteRatio) * r)
  const wg = Math.round(whiteRatio * 255 + (1 - whiteRatio) * g)
  const wb = Math.round(whiteRatio * 255 + (1 - whiteRatio) * b)
  return `#${wr.toString(16).padStart(2, "0")}${wg.toString(16).padStart(2, "0")}${wb.toString(16).padStart(2, "0")}`
}

/** Opacity for pins that do not match the active filters (still visible and clickable). */
const FILTER_DIMMED_OPACITY = 0.25

const DIMMED_SOURCE_ID = "pin-features-dimmed"

const pinLabelsVisibleFilter: maplibregl.FilterSpecification = ["!", ["has", "point_count"]]

const pinIconLayout: maplibregl.SymbolLayerSpecification["layout"] = {
  "icon-image": ["get", "pin_type_icon"],
  "icon-size": 1,
  "icon-anchor": "bottom",
  "icon-allow-overlap": true,
  "icon-ignore-placement": true,
}

function toPinFeature(pin: Pin, catalog: CustomPinType[]) {
  const pinColor = resolvePinTypeConfig(pin.pin_type, catalog).color
  return {
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [pin.longitude, pin.latitude] as [number, number] },
    properties: {
      pin_id: pin.id,
      title: truncateTitle(pin.title),
      pin_type: pin.pin_type,
      pin_type_icon: getPinTypeMarkerImageId(pin.pin_type),
      haloColor: desaturateHex(pinColor),
    },
  }
}

function buildPinFeatureSets(pinList: Pin[], filterState: FilterState, catalog: CustomPinType[]) {
  const matching: ReturnType<typeof toPinFeature>[] = []
  const dimmed: ReturnType<typeof toPinFeature>[] = []
  for (const pin of pinList) {
    const feature = toPinFeature(pin, catalog)
    if (pinMatchesFilter(pin, filterState, catalog)) matching.push(feature)
    else dimmed.push(feature)
  }
  return { matching, dimmed }
}

/** Stable key so we skip redundant GeoJSON setData when nothing map-visible changed. */
function buildPinGeoJsonSyncKey(
  pins: Pin[],
  filterState: FilterState,
  catalog: CustomPinType[],
): string {
  const pinParts: string[] = []
  for (const p of pins) {
    pinParts.push(`${p.id}:${p.latitude}:${p.longitude}:${p.title}:${p.pin_type}`)
  }
  const catalogParts = catalog.map((c) => `${c.id}:${c.pin_type}`)
  return `${pinParts.join("|")}::${JSON.stringify(filterState)}::${catalogParts.join("|")}`
}

type Props = {
  /** Changes when switching world ↔ community map; resets deep-link pin handling. */
  mapScopeKey?: string
  styleUrl: string
  pins: Pin[]
  initialPinId?: number | null
  /** Bumped on each in-app pin link navigation so repeat clicks to the same pin still focus it. */
  pinFocusSeq?: number
  onMapClick: (lng: number, lat: number) => void
  onEdit: (pinId: number) => void
  onDelete: (pinId: number) => void
  /** When set, map shows the actual pin (highlighted) at this location and flies to it. */
  pendingLocation?: { lat: number; lng: number } | null
  /** Pin type for the pending marker (add: selected or default; edit: pin's type). */
  pendingPinType?: PinType | null
  /** When set, this pin is shown only at pendingLocation (hidden from normal markers). */
  editingPinId?: number | null
  /** When set, map clicks call this (picking location: desktop = set and done, mobile = move pin). */
  onPlacementMapClick?: (lng: number, lat: number) => void
  onPopupOpen?: (pinId: number) => void
  onPopupClose?: () => void
  filter: FilterState
  setFilter: Dispatch<SetStateAction<FilterState>>
  csrfToken?: string
  communityUrl?: string
  onSelectCommunity?: (communityUrl: string) => void
  onNavigateToPin?: (pinId: number) => void
}

export default function MapCanvas({
  mapScopeKey = "world",
  styleUrl,
  pins,
  initialPinId = null,
  pinFocusSeq = 0,
  onMapClick,
  onEdit,
  onDelete,
  pendingLocation = null,
  pendingPinType = null,
  editingPinId = null,
  onPlacementMapClick,
  onPopupOpen,
  onPopupClose,
  filter,
  setFilter,
  csrfToken,
  communityUrl,
  onSelectCommunity,
  onNavigateToPin,
}: Props) {
  const { catalog, enabledBuiltins } = usePinTypes()
  const catalogRef = useRef(catalog)
  catalogRef.current = catalog
  const enabledBuiltinsRef = useRef(enabledBuiltins)
  enabledBuiltinsRef.current = enabledBuiltins
  const mapRef = useRef<MLMap | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pendingMarkerRef = useRef<Marker | null>(null)
  const focusedPinIdRef = useRef<number | null>(null)
  const lastPinFocusSeqRef = useRef(0)
  const pinLayersAddedRef = useRef(false)
  const pinsByIdRef = useRef<Map<number, Pin>>(new Map())
  const onPlacementMapClickRef = useRef(onPlacementMapClick)
  onPlacementMapClickRef.current = onPlacementMapClick
  const onEditRef = useRef(onEdit)
  onEditRef.current = onEdit
  const onDeleteRef = useRef(onDelete)
  onDeleteRef.current = onDelete
  const onPopupOpenRef = useRef(onPopupOpen)
  onPopupOpenRef.current = onPopupOpen
  const onPopupCloseRef = useRef(onPopupClose)
  onPopupCloseRef.current = onPopupClose
  const onMapClickRef = useRef(onMapClick)
  onMapClickRef.current = onMapClick
  const onSelectCommunityRef = useRef(onSelectCommunity)
  onSelectCommunityRef.current = onSelectCommunity
  const openPopupRef = useRef<Popup | null>(null)
  const openPopupPinIdRef = useRef<number | null>(null)
  const popupRootRef = useRef<ReturnType<typeof createRoot> | null>(null)
  const geolocateControlRef = useRef<InstanceType<typeof maplibregl.GeolocateControl> | null>(null)
  const initialGeolocateTriggeredRef = useRef(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapInitError, setMapInitError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [placeSearchActive, setPlaceSearchActive] = useState(false)
  const [pinSearchActive, setPinSearchActive] = useState(false)
  const overlaySearchActive = placeSearchActive || pinSearchActive
  const filterPanelOpenRef = useRef<{ open(): void } | null>(null)
  const searchDismissingClickRef = useRef(false)
  const mapMouseDownHandlerRef = useRef<(() => void) | null>(null)
  const pinLayerHandlersRef = useRef<{
    handlePinIconClick: (e: maplibregl.MapLayerMouseEvent) => void
    handleClusterClick: (e: maplibregl.MapLayerMouseEvent) => void
    setPointerCursor: () => void
    clearPointerCursor: () => void
  } | null>(null)
  const lastPinGeoJsonSyncKeyRef = useRef<string>("")
  const syncPinGeoJsonRef = useRef<() => void>(() => { })
  const knownCustomImageIdsRef = useRef<Set<string>>(new Set())
  const filterRef = useRef(filter)
  filterRef.current = filter

  const pinsForMap =
    editingPinId != null ? pins.filter((p) => p.id !== editingPinId) : pins
  const pinsForMapRef = useRef<Pin[]>(pinsForMap)
  pinsForMapRef.current = pinsForMap
  const pinGeoJsonSyncKey = useMemo(
    () => buildPinGeoJsonSyncKey(pinsForMap, filter, catalog),
    [pinsForMap, filter, catalog],
  )

  function closeOpenPopup(): void {
    const popup = openPopupRef.current
    const root = popupRootRef.current
    openPopupRef.current = null
    openPopupPinIdRef.current = null
    popupRootRef.current = null
    root?.unmount()
    popup?.remove()
  }

  function syncPinGeoJsonToMap(): void {
    const map = mapRef.current
    if (!map || !pinLayersAddedRef.current) return

    const pins = pinsForMapRef.current
    const filterState = filterRef.current
    const catalogSnapshot = catalogRef.current
    const syncKey = buildPinGeoJsonSyncKey(pins, filterState, catalogSnapshot)
    if (syncKey === lastPinGeoJsonSyncKeyRef.current) return

    lastPinGeoJsonSyncKeyRef.current = syncKey
    pinsByIdRef.current = new Map(pins.map((p) => [p.id, p]))

    const featureSets = buildPinFeatureSets(pins, filterState, catalogSnapshot)
      ; (map.getSource(MATCHING_SOURCE_ID) as maplibregl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: featureSets.matching,
      })
      ; (map.getSource(DIMMED_SOURCE_ID) as maplibregl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: featureSets.dimmed,
      })
  }

  syncPinGeoJsonRef.current = syncPinGeoJsonToMap

  useEffect(() => {
    focusedPinIdRef.current = null
    lastPinFocusSeqRef.current = 0
    closeOpenPopup()
  }, [mapScopeKey])

  // Sync with layout drawer (checkbox #drawer-toggle) so we can hide overlays when drawer is open
  useEffect(() => {
    const toggle = document.getElementById("drawer-toggle") as HTMLInputElement | null
    if (!toggle) return
    const sync = () => setDrawerOpen(toggle.checked)
    sync()
    toggle.addEventListener("change", sync)
    return () => toggle.removeEventListener("change", sync)
  }, [])

  // Track search input focus so we can hide filters on mobile while searching
  useEffect(() => {
    if (!mapReady || !containerRef.current) return
    const input = containerRef.current.querySelector<HTMLInputElement>(".maplibre-search-box input")
    if (!input) return
    // Placeholder is not a label; the control is created by MapLibreSearchControl without a <label>.
    input.setAttribute("aria-label", "Search for places")
    const onFocus = () => setPlaceSearchActive(true)
    const onBlur = () => setTimeout(() => setPlaceSearchActive(false), 150)
    input.addEventListener("focus", onFocus)
    input.addEventListener("blur", onBlur)
    return () => {
      input.removeEventListener("focus", onFocus)
      input.removeEventListener("blur", onBlur)
    }
  }, [mapReady])

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current) return
    let isMounted = true
    setMapInitError(null)

    const init = async () => {
      const res = await fetch(styleUrl, { cache: "force-cache" })
      if (!res.ok) throw new Error(`Failed to load map style (${res.status})`)
      const style = await res.json()
      if (!isMounted) return
      const control = new MapLibreSearchControl({
        minWaitPeriodMs: 500,
        onResultSelected: feature => {
          void feature
        },
        // You can also use our EU endpoint to keep traffic within the EU using the basePath option:
        // baseUrl: "https://api-eu.stadiamaps.com",
      });
      const map = new maplibregl.Map({
        container: containerRef.current!,
        style,
        center: [0, 0],
        zoom: 2,
        maxZoom: 20,
        renderWorldCopies: false,
        refreshExpiredTiles: false,
        fadeDuration: 50,
        // performance optimization
        validateStyle: false,
      })
      // The search control is implemented against a different maplibre-gl type instance;
      // coerce it to the expected IControl to satisfy TypeScript.
      map.addControl(control as unknown as maplibregl.IControl, "top-left")
      const geolocateControl = new maplibregl.GeolocateControl({
        positionOptions: GEOLOCATE_POSITION_OPTIONS,
        trackUserLocation: false,
        fitBoundsOptions: {
          maxZoom: GEOLOCATE_MAX_ZOOM,
        },
      })
      map.addControl(geolocateControl, "top-right")
      geolocateControlRef.current = geolocateControl
      mapRef.current = map
      const container = map.getContainer()
      const onMapMouseDown = () => {
        const searchBox = container.querySelector(".maplibre-search-box")
        if (searchBox?.contains(document.activeElement)) {
          searchDismissingClickRef.current = true
        }
      }
      mapMouseDownHandlerRef.current = onMapMouseDown
      container.addEventListener("mousedown", onMapMouseDown)
      map.on("click", (e) => {
        if (searchDismissingClickRef.current) {
          searchDismissingClickRef.current = false
          return
        }
        if (onPlacementMapClickRef.current) {
          onPlacementMapClickRef.current(e.lngLat.lng, e.lngLat.lat)
          return
        }

        const hasVisiblePopup = document.querySelector(".maplibregl-popup") !== null
        if (hasVisiblePopup) return

        // Ignore clicks on pins / clusters (handled by layer click handlers)
        const hit = map.queryRenderedFeatures(e.point, {
          layers: [...PIN_INTERACTIVE_LAYER_IDS],
        })
        if (hit.length > 0) return

        onMapClickRef.current(e.lngLat.lng, e.lngLat.lat)
      })
      map.on("load", async () => {
        const map = mapRef.current
        if (!map || !isMounted) return
        try {
          for (const pinType of BUILTIN_PIN_TYPES) {
            const dataUrl = createPinTypeMarkerSVG(pinType)
            const img = await loadImage(dataUrl)
            if (!isMounted) return
            map.addImage(getPinTypeMarkerImageId(pinType), img)
          }
          map.addSource(MATCHING_SOURCE_ID, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
            cluster: true,
            clusterRadius: CLUSTER_RADIUS_PX,
            clusterMaxZoom: CLUSTER_MAX_ZOOM,
          })
          map.addSource(DIMMED_SOURCE_ID, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          })
          map.addLayer({
            id: "pin-icons-dimmed-layer",
            type: "symbol",
            source: DIMMED_SOURCE_ID,
            layout: pinIconLayout,
            paint: {
              "icon-opacity": FILTER_DIMMED_OPACITY,
            },
          })
          map.addLayer({
            id: "pin-icons-layer",
            type: "symbol",
            source: MATCHING_SOURCE_ID,
            filter: ["!", ["has", "point_count"]],
            layout: pinIconLayout,
          })
          map.addLayer({
            id: "pin-clusters-layer",
            type: "circle",
            source: MATCHING_SOURCE_ID,
            filter: ["has", "point_count"],
            paint: {
              "circle-color": [
                "step",
                ["get", "point_count"],
                "#60a5fa", // blue-400
                10,
                "#34d399", // emerald-400
                50,
                "#f59e0b", // amber-500
              ],
              "circle-radius": [
                "step",
                ["get", "point_count"],
                14,
                10,
                18,
                50,
                24,
              ],
              "circle-opacity": 0.9,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
            },
          })
          map.addLayer({
            id: "pin-cluster-count-layer",
            type: "symbol",
            source: MATCHING_SOURCE_ID,
            filter: ["has", "point_count"],
            layout: {
              "text-field": ["get", "point_count_abbreviated"],
              "text-font": ["Open Sans Bold", "sans-serif"],
              "text-size": 12,
              "text-allow-overlap": true,
              "text-ignore-placement": true,
            },
            paint: {
              "text-color": "#0b1220",
            },
          })
          map.addLayer({
            id: "pin-labels-layer",
            type: "symbol",
            source: MATCHING_SOURCE_ID,
            filter: pinLabelsVisibleFilter,
            layout: {
              "text-field": ["get", "title"],
              "text-font": ["Open Sans Bold", "sans-serif"],
              "text-size": 14,
              "text-anchor": "top",
              "text-offset": [0, 0],
              "text-allow-overlap": true,
              "text-ignore-placement": true,
            },
            paint: {
              "text-color": "#1f2937",
              "text-halo-color": ["get", "haloColor"],
              "text-halo-width": 1.7,
            },
          })
          const handlePinIconClick = (e: maplibregl.MapLayerMouseEvent) => {
            const pinId = pinIdFromTopFeatureAt(map, e.point)
            if (pinId == null) return
            const pin = pinsByIdRef.current.get(pinId)
            if (!pin) return
            openPinPopup(map, pin)
          }

          const handleClusterClick = (e: maplibregl.MapLayerMouseEvent) => {
            const source = map.getSource(MATCHING_SOURCE_ID) as maplibregl.GeoJSONSource
            void expandClusterAtPoint(map, e.point, source)
          }

          const setPointerCursor = () => {
            map.getCanvas().style.cursor = "pointer"
          }
          const clearPointerCursor = () => {
            map.getCanvas().style.cursor = ""
          }

          pinLayerHandlersRef.current = {
            handlePinIconClick,
            handleClusterClick,
            setPointerCursor,
            clearPointerCursor,
          }

          map.on("click", "pin-icons-layer", handlePinIconClick)
          map.on("click", "pin-icons-dimmed-layer", handlePinIconClick)
          map.on("click", "pin-clusters-layer", handleClusterClick)
          map.on("click", "pin-cluster-count-layer", handleClusterClick)
          map.on("mouseenter", "pin-icons-layer", setPointerCursor)
          map.on("mouseleave", "pin-icons-layer", clearPointerCursor)
          map.on("mouseenter", "pin-icons-dimmed-layer", setPointerCursor)
          map.on("mouseleave", "pin-icons-dimmed-layer", clearPointerCursor)
          map.on("mouseenter", "pin-clusters-layer", setPointerCursor)
          map.on("mouseleave", "pin-clusters-layer", clearPointerCursor)
          map.on("mouseenter", "pin-cluster-count-layer", setPointerCursor)
          map.on("mouseleave", "pin-cluster-count-layer", clearPointerCursor)

          pinLayersAddedRef.current = true
          syncPinGeoJsonRef.current()

          if (!isMounted) return
          setMapReady(true)
        } catch (err) {
          console.error("Failed to set up pin layers", err)
          if (!isMounted) return
          setMapReady(true)
        }
      })
    }
    init().catch((err) => {
      console.error("Failed to initialize map", err)
      if (!isMounted) return
      const message = err instanceof Error ? err.message : "Failed to initialize map"
      setMapInitError(message)
    })

    return () => {
      isMounted = false
      pinLayersAddedRef.current = false
      lastPinGeoJsonSyncKeyRef.current = ""
      initialGeolocateTriggeredRef.current = false
      const map = mapRef.current
      const handler = mapMouseDownHandlerRef.current
      if (map && handler) {
        map.getContainer().removeEventListener("mousedown", handler)
        mapMouseDownHandlerRef.current = null
      }
      const pinHandlers = pinLayerHandlersRef.current
      if (map && pinHandlers) {
        map.off("click", "pin-icons-layer", pinHandlers.handlePinIconClick)
        map.off("click", "pin-icons-dimmed-layer", pinHandlers.handlePinIconClick)
        map.off("click", "pin-clusters-layer", pinHandlers.handleClusterClick)
        map.off("click", "pin-cluster-count-layer", pinHandlers.handleClusterClick)
        map.off("mouseenter", "pin-icons-layer", pinHandlers.setPointerCursor)
        map.off("mouseleave", "pin-icons-layer", pinHandlers.clearPointerCursor)
        map.off("mouseenter", "pin-icons-dimmed-layer", pinHandlers.setPointerCursor)
        map.off("mouseleave", "pin-icons-dimmed-layer", pinHandlers.clearPointerCursor)
        map.off("mouseenter", "pin-clusters-layer", pinHandlers.setPointerCursor)
        map.off("mouseleave", "pin-clusters-layer", pinHandlers.clearPointerCursor)
        map.off("mouseenter", "pin-cluster-count-layer", pinHandlers.setPointerCursor)
        map.off("mouseleave", "pin-cluster-count-layer", pinHandlers.clearPointerCursor)
        pinLayerHandlersRef.current = null
      }
      closeOpenPopup()
      pendingMarkerRef.current?.remove()
      pendingMarkerRef.current = null
      geolocateControlRef.current = null
      knownCustomImageIdsRef.current = new Set()
      mapRef.current?.remove()
      mapRef.current = null
      setMapReady(false)
      setMapInitError(null)
    }
  }, [styleUrl])

  // Center on user location once on first load (skip when opening a shared pin link).
  // Use flyTo instead of GeolocateControl.trigger() — fitBounds from the initial globe
  // view (zoom 2) can overshoot maxZoom; the button path starts from a regional zoom.
  useEffect(() => {
    if (!mapReady || initialPinId != null || initialGeolocateTriggeredRef.current) return
    const map = mapRef.current
    if (!map || !navigator.geolocation) return

    let cancelled = false
    initialGeolocateTriggeredRef.current = true

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled || !mapRef.current) return
        mapRef.current.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: GEOLOCATE_MAX_ZOOM,
        })
      },
      () => { },
      GEOLOCATE_POSITION_OPTIONS,
    )

    return () => {
      cancelled = true
    }
  }, [mapReady, initialPinId])

  // Pending location: actual pin (highlighted) + flyTo
  const pendingPinTypeRef = useRef<PinType | null>(null)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    if (pendingLocation) {
      map.flyTo({ center: [pendingLocation.lng, pendingLocation.lat], zoom: PIN_FOCUS_ZOOM })
      const pinType: PinType = pendingPinType ?? DEFAULT_BUILTIN_PIN_TYPE
      const typeChanged = pendingPinTypeRef.current !== pinType
      if (!pendingMarkerRef.current || typeChanged) {
        pendingMarkerRef.current?.remove()
        pendingMarkerRef.current = null
        pendingPinTypeRef.current = pinType
        const el = createPinTypeMarkerElement(pinType, { pending: true }, catalogRef.current)
        el.classList.add("pin-marker--pending")
        pendingMarkerRef.current = new Marker({ element: el, anchor: "bottom" })
          .setLngLat([pendingLocation.lng, pendingLocation.lat])
          .addTo(map)
      } else {
        pendingMarkerRef.current.setLngLat([pendingLocation.lng, pendingLocation.lat])
      }
    } else {
      pendingMarkerRef.current?.remove()
      pendingMarkerRef.current = null
      pendingPinTypeRef.current = null
    }

    return () => {
      pendingMarkerRef.current?.remove()
      pendingMarkerRef.current = null
    }
  }, [pendingLocation, pendingPinType, mapReady])

  // Set up event delegation for popup buttons
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const handlePopupClick = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.matches('[data-pin-action]')) {
        e.stopPropagation()
        const action = target.dataset.pinAction
        const pinId = parseInt(target.dataset.pinId || '0', 10)
        if (action === 'edit') {
          onEditRef.current(pinId)
        } else if (action === 'delete') {
          onDeleteRef.current(pinId)
        } else if (action === 'copy-link') {
          const pin = pinsByIdRef.current.get(pinId)
          const url = pin ? pinMapUrl(pin) : `${window.location.origin}/map?pin=${pinId}`
          navigator.clipboard.writeText(url).then(() => {
            const btn = target
            const originalText = btn.textContent
            btn.textContent = 'Copied!'
            setTimeout(() => { btn.textContent = originalText }, 1500)
          })
        }
      } else if (target.matches('[data-tag]')) {
        e.stopPropagation()
        const tag = target.dataset.tag
        if (tag) {
          const communityFromTag = communityUrlFromTag(tag)
          if (communityFromTag) {
            onSelectCommunityRef.current?.(communityFromTag)
            return
          }
          setFilter((f) => ({ ...f, tag }))
          filterPanelOpenRef.current?.open()
          document.querySelectorAll('.maplibregl-popup').forEach((el) => {
            (el as HTMLElement).style.display = 'none'
          })
        }
      }
    }

    // Add event listener to map container for delegation
    map.getContainer().addEventListener('click', handlePopupClick)

    return () => {
      map.getContainer().removeEventListener('click', handlePopupClick)
    }
  }, [mapReady])

  function renderPopupContent(pin: Pin) {
    return (
      <PinTypesProvider catalog={catalogRef.current} enabledBuiltins={enabledBuiltinsRef.current}>
        <PopupContent
          pin={pin}
          csrfToken={csrfToken}
          communityUrl={communityUrl}
          onSelectCommunity={onSelectCommunity}
          onNavigateToPin={onNavigateToPin}
        />
      </PinTypesProvider>
    )
  }

  function openPinPopup(map: MLMap, pin: Pin): void {
    if (openPopupRef.current) {
      closeOpenPopup()
    }
    focusedPinIdRef.current = pin.id
    onPopupOpenRef.current?.(pin.id)
    const container = document.createElement("div")
    const root = createRoot(container)
    root.render(renderPopupContent(pin))
    const popup = new Popup({
      closeButton: false,
      locationOccludedOpacity: 0.7,
      maxWidth: "80%",
    })
      .setLngLat([pin.longitude, pin.latitude])
      .setDOMContent(container)
      .addTo(map)
    openPopupRef.current = popup
    openPopupPinIdRef.current = pin.id
    popupRootRef.current = root
    popup.on("close", () => {
      if (openPopupRef.current === popup) {
        openPopupRef.current = null
        openPopupPinIdRef.current = null
        popupRootRef.current = null
        root.unmount()
        onPopupCloseRef.current?.()
      }
    })
  }

  // Sync GeoJSON pin layers when pins or filters change (not on unrelated popup prop changes).
  useEffect(() => {
    if (!mapReady || !pinLayersAddedRef.current) return
    syncPinGeoJsonRef.current()
  }, [pinGeoJsonSyncKey, mapReady])

  // Refresh open popup content when pin data or popup props change.
  useEffect(() => {
    if (openPopupRef.current == null || openPopupPinIdRef.current == null || popupRootRef.current == null) {
      return
    }
    const pin = pinsByIdRef.current.get(openPopupPinIdRef.current)
    if (pin) {
      popupRootRef.current.render(renderPopupContent(pin))
    } else {
      closeOpenPopup()
    }
  }, [pinsForMap, mapReady, csrfToken, communityUrl, catalog, enabledBuiltins, onSelectCommunity, onNavigateToPin])

  // Deep-link / repeat navigation to a specific pin.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || initialPinId == null) return

    const focusRequested = pinFocusSeq !== lastPinFocusSeqRef.current
    const pinChanged = initialPinId !== focusedPinIdRef.current
    if (!focusRequested && !pinChanged) return

    if (focusRequested) lastPinFocusSeqRef.current = pinFocusSeq
    const pin = pins.find((p) => p.id === initialPinId)
    if (!pin) return

    // clear all filters in case the pin is not shown in the initial filters
    setFilter(CLEARED_FILTER)
    focusedPinIdRef.current = initialPinId
    map.flyTo({ center: [pin.longitude, pin.latitude], zoom: PIN_FOCUS_ZOOM })
    openPinPopup(map, pin)
  }, [initialPinId, pinFocusSeq, pins, mapReady, setFilter])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const registerCustomImages = async () => {
      const nextIds = new Set<string>()
      for (const pinType of catalog) {
        const imageId = getPinTypeMarkerImageId(pinType.pin_type)
        nextIds.add(imageId)
        if (map.hasImage(imageId)) continue
        try {
          const dataUrl = createPinTypeMarkerSVG(pinType.pin_type, catalog)
          const img = await loadImage(dataUrl)
          if (!mapRef.current || mapRef.current !== map) return
          if (!map.hasImage(imageId)) map.addImage(imageId, img)
        } catch {
          // ignore failed custom marker images
        }
      }
      for (const imageId of knownCustomImageIdsRef.current) {
        if (!nextIds.has(imageId) && map.hasImage(imageId)) {
          map.removeImage(imageId)
        }
      }
      knownCustomImageIdsRef.current = nextIds
    }

    void registerCustomImages()
  }, [catalog, mapReady])

  return (
    <div className="relative w-full h-full">
      {!mapReady && mapInitError == null && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-base-100/60 text-base-content">
          <div className="rounded-box bg-base-100 shadow px-4 py-3 text-sm font-medium">
            Loading map…
          </div>
        </div>
      )}
      {!mapReady && mapInitError != null && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-base-100/70 text-base-content">
          <div className="max-w-md rounded-box bg-base-100 shadow px-4 py-3 text-sm">
            <div className="font-semibold">Map failed to load</div>
            <div className="mt-1 opacity-80 break-words">{mapInitError}</div>
            <div className="mt-3">
              <button className="btn btn-sm" type="button" onClick={() => window.location.reload()}>
                Reload
              </button>
            </div>
          </div>
        </div>
      )}
      {mapReady && !drawerOpen && (
        <div className={overlaySearchActive ? "max-sm:hidden" : "contents"}>
          <MapFilters
            pins={pins}
            filter={filter}
            setFilter={setFilter}
            openRef={filterPanelOpenRef}
            position="top-right"
            panelTopOffset={mapShellTopRightOverlayTop()}
          />
        </div>
      )}
      {mapReady && !drawerOpen && (
        <PinSearch
          pins={pins}
          filter={filter}
          setFilter={setFilter}
          topOffset={mapShellTopLeftPinSearchTop()}
          onFocusChange={setPinSearchActive}
          onSelectPin={(pin) => {
            const map = mapRef.current
            if (!map) return
            map.flyTo({ center: [pin.longitude, pin.latitude], zoom: PIN_FOCUS_ZOOM })
            openPinPopup(map, pin)
          }}
        />
      )}
      {onPlacementMapClick && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30">
          <div className="bg-primary text-primary-content rounded shadow px-4 py-2 text-sm font-medium">
            Click or tap on the map to set location
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        id="map"
        className="w-full h-full"
        role="region"
        aria-label="Interactive map. Pinch or scroll to zoom; drag to pan."
      />
    </div>
  )
}

