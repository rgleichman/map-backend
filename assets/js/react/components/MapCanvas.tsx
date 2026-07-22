import React, { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react"
import maplibregl, { Map as MLMap, Marker } from "maplibre-gl"
import type { Pin, PinLink, PinType } from "../types"
import { getPinBacklinks } from "../api/client"
import { BUILTIN_PIN_TYPES, DEFAULT_BUILTIN_PIN_TYPE } from "../utils/builtinPinType"
import {
  createPinTypeMarkerElement,
  createPinTypeMarkerSVG,
  getPinTypeMarkerImageId,
} from "../utils/pinTypeIcons"
import { usePinTypes } from "../context/PinTypesContext"
import { buildMapFilterSyncKey, createPinFilterMatcher, type FilterState } from "./map/filters"
import type { PinFocusIntent } from "../hooks/mapHookTypes"
import { parsePinIdFromSearch } from "../mapRoute"
import type { PlaceSuggestion } from "../utils/placeSearch"
import {
  expandClusterAtPoint,
  MATCHING_SOURCE_ID,
  pinIdFromTopFeatureAt,
  PIN_INTERACTIVE_LAYER_IDS,
} from "./map/clusterInteraction"
import {
  buildPinFeatureSets,
  buildPinGeoJsonSyncKey,
  CLUSTER_MAX_ZOOM,
  CLUSTER_RADIUS_PX,
  DIMMED_SOURCE_ID,
  FILTER_DIMMED_OPACITY,
  PIN_ICONS_SELECTED_LAYER_ID,
  pinIconLayout,
  pinIconsSelectedFilter,
  pinIconsUnselectedFilter,
  pinLabelLayout,
  pinLabelsVisibleFilter,
  suppressOverlappingPinLabels,
} from "./map/mapPinFeatures"
import { takeLastVisitWatermark } from "../utils/mapLastVisit"
import { cacheDeviceLocation } from "../utils/nearUserLocation"
import {
  buildPinLinkGeoJson,
  buildPinLinkSyncKey,
  PIN_LINKS_LAYER_ID,
  PIN_LINKS_SOURCE_ID,
  readShowConnectionsPreference,
  resolveOtherPinIdFromLink,
  writeShowConnectionsPreference,
  pinLinkLinePaint,
} from "./map/pinLinkFeatures"
import { usePinHoverPopup } from "./map/usePinHoverPopup"
import { mapPaddingForPinPanel, usePinPanelCamera } from "./map/usePinPanelCamera"
import { loadImage, registerCustomPinImages } from "./map/registerCustomPinImages"
import MapFilters from "./MapFilters"
import PinConnectionsToggle from "./PinConnectionsToggle"
import MapSearch from "./MapSearch"
import Button from "./ui/Button"
import {
  mapShellOverlayBottomAboveHelp,
  mapShellTopRightOverlayTop,
} from "../utils/siteLayout"

const GEOLOCATE_MAX_ZOOM = 12
const PIN_FOCUS_ZOOM = 14
const GEOLOCATE_POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 20 * 60 * 1000,
}

type Props = {
  /** Changes when switching world ↔ community map; resets deep-link pin handling. */
  mapScopeKey?: string
  styleUrl: string
  pins: Pin[]
  /** One-shot flyTo after App opens a pin from URL/nav (does not call onOpenPin). */
  cameraRequest?: PinFocusIntent | null
  onCameraRequestConsumed?: () => void
  isDesktop?: boolean
  /** Pin id currently shown in the detail panel (view or edit); drives selection highlight + link focus. */
  detailPinId?: number | null
  /** Desktop right-rail open — shifts MapLibre padding so the globe sits in the visible area. */
  pinPanelOpen?: boolean
  /** True while placing/editing a pin location (suppresses hover tooltips). */
  placementActive?: boolean
  onMapClick: (lng: number, lat: number) => void
  onOpenPin: (pinId: number) => void
  /** Dismiss pin detail panel (e.g. empty map click). */
  onDismissPinDetail?: () => void
  /** When set, map shows the actual pin (highlighted) at this location and flies to it. */
  pendingLocation?: { lat: number; lng: number } | null
  /** Pin type for the pending marker (add: selected or default; edit: pin's type). */
  pendingPinType?: PinType | null
  /** When set, this pin is shown only at pendingLocation (hidden from normal markers). */
  editingPinId?: number | null
  /** When set, map clicks call this (picking location: desktop = set and done, mobile = move pin). */
  onPlacementMapClick?: (lng: number, lat: number) => void
  filter: FilterState
  setFilter: Dispatch<SetStateAction<FilterState>>
  userId?: number
  onNavigateToPin?: (pinId: number) => void
  heartedPinIds?: ReadonlySet<number>
  pinHeartsLoading?: boolean
}

export default function MapCanvas({
  mapScopeKey = "world",
  styleUrl,
  pins,
  cameraRequest = null,
  onCameraRequestConsumed,
  isDesktop = false,
  detailPinId = null,
  pinPanelOpen = false,
  placementActive = false,
  onMapClick,
  onOpenPin,
  onDismissPinDetail,
  pendingLocation = null,
  pendingPinType = null,
  editingPinId = null,
  onPlacementMapClick,
  filter,
  setFilter,
  userId,
  onNavigateToPin,
  heartedPinIds = new Set(),
  pinHeartsLoading = false,
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
  const lastCameraRequestTokenRef = useRef(0)
  const onCameraRequestConsumedRef = useRef(onCameraRequestConsumed)
  onCameraRequestConsumedRef.current = onCameraRequestConsumed
  const pinLayersAddedRef = useRef(false)
  const pinsByIdRef = useRef<Map<number, Pin>>(new Map())
  const pinsRef = useRef(pins)
  pinsRef.current = pins
  const onPlacementMapClickRef = useRef(onPlacementMapClick)
  onPlacementMapClickRef.current = onPlacementMapClick
  const onOpenPinRef = useRef(onOpenPin)
  onOpenPinRef.current = onOpenPin
  const onMapClickRef = useRef(onMapClick)
  onMapClickRef.current = onMapClick
  const detailPinIdRef = useRef(detailPinId)
  detailPinIdRef.current = detailPinId
  const pinPanelOpenRef = useRef(pinPanelOpen)
  pinPanelOpenRef.current = pinPanelOpen
  const isDesktopRef = useRef(isDesktop)
  isDesktopRef.current = isDesktop
  const placementActiveRef = useRef(placementActive)
  placementActiveRef.current = placementActive
  const onDismissPinDetailRef = useRef(onDismissPinDetail)
  onDismissPinDetailRef.current = onDismissPinDetail
  const { showHoverTooltip, clearHoverTooltip } = usePinHoverPopup({
    catalogRef,
    enabledBuiltinsRef,
    isDesktopRef,
    placementActiveRef,
    detailPinIdRef,
    pinPanelOpenRef,
    isDesktop,
    placementActive,
    detailPinId,
  })
  const showHoverTooltipRef = useRef(showHoverTooltip)
  showHoverTooltipRef.current = showHoverTooltip
  const clearHoverTooltipRef = useRef(clearHoverTooltip)
  clearHoverTooltipRef.current = clearHoverTooltip
  const geolocateControlRef = useRef<InstanceType<typeof maplibregl.GeolocateControl> | null>(null)
  const initialGeolocateTriggeredRef = useRef(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapInitError, setMapInitError] = useState<string | null>(null)
  /** Previous visit watermark for this map scope; null on first visit. */
  const [lastVisitWatermark, setLastVisitWatermark] = useState<Date | null>(() =>
    takeLastVisitWatermark(mapScopeKey),
  )
  const [showConnections, setShowConnections] = useState(() => readShowConnectionsPreference())
  const [focusedBacklinks, setFocusedBacklinks] = useState<PinLink[] | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchActive, setSearchActive] = useState(false)
  const searchActiveRef = useRef(searchActive)
  searchActiveRef.current = searchActive
  const filterPanelOpenRef = useRef<{ open(): void } | null>(null)
  const searchDismissingClickRef = useRef(false)
  const mapMouseDownHandlerRef = useRef<(() => void) | null>(null)
  const pinLayerHandlersRef = useRef<{
    handlePinIconClick: (e: maplibregl.MapLayerMouseEvent) => void
    handleClusterClick: (e: maplibregl.MapLayerMouseEvent) => void
    handlePinHoverMove: (e: maplibregl.MapMouseEvent) => void
    handleCanvasMouseLeave: () => void
    setPointerCursor: () => void
    clearPointerCursor: () => void
  } | null>(null)
  const lastPinGeoJsonSyncKeyRef = useRef<string>("")
  const lastPinLinkSyncKeyRef = useRef<string>("")
  const syncPinGeoJsonRef = useRef<() => void>(() => { })
  const pinLinkLayerAddedRef = useRef(false)
  const pinLinkLayerHandlersRef = useRef<{
    handlePinLinkClick: (e: maplibregl.MapLayerMouseEvent) => void
    setPointerCursor: () => void
    clearPointerCursor: () => void
  } | null>(null)
  const onNavigateToPinRef = useRef(onNavigateToPin)
  onNavigateToPinRef.current = onNavigateToPin
  const knownCustomImageIdsRef = useRef<Set<string>>(new Set())
  const customImageVisualKeysRef = useRef<Map<string, string>>(new Map())
  /** False while custom images are (re)registering; GeoJSON sync must wait. */
  const customImagesReadyRef = useRef(false)

  const pinsForMap =
    editingPinId != null ? pins.filter((p) => p.id !== editingPinId) : pins
  const pinsForMapRef = useRef<Pin[]>(pinsForMap)
  pinsForMapRef.current = pinsForMap
  const pinFilterMatcher = useMemo(
    () => createPinFilterMatcher(pinsForMap, filter, catalog, heartedPinIds),
    [pinsForMap, filter, catalog, heartedPinIds],
  )
  const pinFilterMatcherRef = useRef(pinFilterMatcher)
  pinFilterMatcherRef.current = pinFilterMatcher
  const filterSyncKey = useMemo(
    () => buildMapFilterSyncKey(filter, heartedPinIds),
    [filter, heartedPinIds],
  )
  const filterSyncKeyRef = useRef(filterSyncKey)
  filterSyncKeyRef.current = filterSyncKey
  const lastVisitWatermarkMs = lastVisitWatermark?.getTime() ?? null
  const lastVisitWatermarkRef = useRef(lastVisitWatermark)
  lastVisitWatermarkRef.current = lastVisitWatermark
  const pinGeoJsonSyncKey = useMemo(
    () =>
      buildPinGeoJsonSyncKey(
        pinsForMap,
        filterSyncKey,
        catalog,
        lastVisitWatermarkMs,
        detailPinId,
      ),
    [pinsForMap, filterSyncKey, catalog, lastVisitWatermarkMs, detailPinId],
  )
  const pinLinkBuildParams = useMemo(
    () => ({
      pins: pinsForMap,
      catalog,
      focusPinId: detailPinId,
      backlinks: focusedBacklinks,
      showConnections,
      pinMatches: pinFilterMatcher,
      filterSyncKey,
    }),
    [pinsForMap, catalog, detailPinId, focusedBacklinks, showConnections, pinFilterMatcher, filterSyncKey],
  )
  const pinLinkBuildResult = useMemo(
    () => buildPinLinkGeoJson(pinLinkBuildParams),
    [pinLinkBuildParams],
  )
  const pinLinkSyncKey = useMemo(
    () => buildPinLinkSyncKey(pinLinkBuildParams),
    [pinLinkBuildParams],
  )

  /** Fly to a pin, padding for the desktop panel so it centers in the visible area. */
  function flyToPin(map: MLMap, pin: Pin): void {
    map.flyTo({
      center: [pin.longitude, pin.latitude],
      zoom: PIN_FOCUS_ZOOM,
      padding: mapPaddingForPinPanel(map, isDesktopRef.current),
    })
  }

  function selectPin(map: MLMap, pin: Pin, opts?: { flyTo?: boolean }): void {
    focusedPinIdRef.current = pin.id
    if (opts?.flyTo) flyToPin(map, pin)
    onOpenPinRef.current(pin.id)
  }

  function syncPinGeoJsonToMap(): void {
    const map = mapRef.current
    if (!map || !pinLayersAddedRef.current) return

    const pins = pinsForMapRef.current
    const catalogSnapshot = catalogRef.current
    const watermark = lastVisitWatermarkRef.current
    const syncKey = buildPinGeoJsonSyncKey(
      pins,
      filterSyncKeyRef.current,
      catalogSnapshot,
      watermark?.getTime() ?? null,
      detailPinIdRef.current ?? null,
    )
    if (syncKey === lastPinGeoJsonSyncKeyRef.current) return

    lastPinGeoJsonSyncKeyRef.current = syncKey
    pinsByIdRef.current = new Map(pins.map((p) => [p.id, p]))

    const featureSets = buildPinFeatureSets(
      pins,
      pinFilterMatcherRef.current,
      catalogSnapshot,
      watermark,
      detailPinIdRef.current ?? null,
    )
    const project = (lng: number, lat: number) => map.project([lng, lat])
    const matching = suppressOverlappingPinLabels(
      featureSets.matching,
      detailPinIdRef.current ?? null,
      project,
    )
      ; (map.getSource(MATCHING_SOURCE_ID) as maplibregl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: matching,
      })
      ; (map.getSource(DIMMED_SOURCE_ID) as maplibregl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: featureSets.dimmed,
      })
  }

  syncPinGeoJsonRef.current = syncPinGeoJsonToMap

  useEffect(() => {
    if (!mapReady || !pinLinkLayerAddedRef.current) return
    const map = mapRef.current
    if (!map) return
    if (pinLinkSyncKey === lastPinLinkSyncKeyRef.current) return
    lastPinLinkSyncKeyRef.current = pinLinkSyncKey
      ; (map.getSource(PIN_LINKS_SOURCE_ID) as maplibregl.GeoJSONSource).setData(
        pinLinkBuildResult.featureCollection,
      )
  }, [pinLinkSyncKey, pinLinkBuildResult, mapReady])

  useEffect(() => {
    if (!showConnections || detailPinId == null) {
      setFocusedBacklinks(null)
      return
    }
    let cancelled = false
    setFocusedBacklinks(null)
    getPinBacklinks(detailPinId)
      .then(({ data }) => {
        if (!cancelled) setFocusedBacklinks(data)
      })
      .catch(() => {
        if (!cancelled) setFocusedBacklinks([])
      })
    return () => {
      cancelled = true
    }
  }, [showConnections, detailPinId])

  const handleConnectionsToggle = () => {
    setShowConnections((prev) => {
      const next = !prev
      writeShowConnectionsPreference(next)
      return next
    })
  }

  useEffect(() => {
    focusedPinIdRef.current = null
    lastCameraRequestTokenRef.current = 0
    lastPinGeoJsonSyncKeyRef.current = ""
    lastPinLinkSyncKeyRef.current = ""
    setLastVisitWatermark(takeLastVisitWatermark(mapScopeKey))
    setFocusedBacklinks(null)
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
      const geolocateControl = new maplibregl.GeolocateControl({
        positionOptions: GEOLOCATE_POSITION_OPTIONS,
        trackUserLocation: false,
        fitBoundsOptions: {
          maxZoom: GEOLOCATE_MAX_ZOOM,
        },
      })
      geolocateControl.on("geolocate", (position: GeolocationPosition) => {
        cacheDeviceLocation(position.coords)
      })
      map.addControl(geolocateControl, "top-right")
      geolocateControlRef.current = geolocateControl
      mapRef.current = map
      const container = map.getContainer()
      const onMapMouseDown = () => {
        if (searchActiveRef.current) {
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

        // Ignore clicks on pins / clusters / link lines (handled by layer click handlers)
        const hit = map.queryRenderedFeatures(e.point, {
          layers: [...PIN_INTERACTIVE_LAYER_IDS, PIN_LINKS_LAYER_ID],
        })
        if (hit.length > 0) return

        // Empty map click dismisses open pin detail
        if (detailPinIdRef.current != null && onDismissPinDetailRef.current) {
          onDismissPinDetailRef.current()
          return
        }

        onMapClickRef.current(e.lngLat.lng, e.lngLat.lat)
      })
      map.on("load", async () => {
        const map = mapRef.current
        if (!map || !isMounted) return
        try {
          for (const pinType of BUILTIN_PIN_TYPES) {
            for (const outline of [undefined, "new", "selected"] as const) {
              const dataUrl = createPinTypeMarkerSVG(pinType, [], outline)
              const img = await loadImage(dataUrl)
              if (!isMounted) return
              map.addImage(getPinTypeMarkerImageId(pinType, outline), img)
            }
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
          map.addSource(PIN_LINKS_SOURCE_ID, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          })
          map.addLayer({
            id: PIN_LINKS_LAYER_ID,
            type: "line",
            source: PIN_LINKS_SOURCE_ID,
            paint: pinLinkLinePaint,
          })
          pinLinkLayerAddedRef.current = true
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
            filter: pinIconsUnselectedFilter,
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
            layout: pinLabelLayout,
            paint: {
              "text-color": "#1f2937",
              "text-halo-color": ["get", "haloColor"],
              "text-halo-width": ["get", "haloWidth"],
            },
          })
          // Selected marker above labels so overlapping titles cannot show through it.
          map.addLayer({
            id: PIN_ICONS_SELECTED_LAYER_ID,
            type: "symbol",
            source: MATCHING_SOURCE_ID,
            filter: pinIconsSelectedFilter,
            layout: pinIconLayout,
          })
          const handlePinIconClick = (e: maplibregl.MapLayerMouseEvent) => {
            const pinId = pinIdFromTopFeatureAt(map, e.point)
            if (pinId == null) return
            const pin = pinsByIdRef.current.get(pinId)
            if (!pin) return
            selectPin(map, pin)
          }

          const handleClusterClick = (e: maplibregl.MapLayerMouseEvent) => {
            const source = map.getSource(MATCHING_SOURCE_ID) as maplibregl.GeoJSONSource
            void expandClusterAtPoint(map, e.point, source)
          }

          const handlePinLinkClick = (e: maplibregl.MapLayerMouseEvent) => {
            const feature = e.features?.[0]
            if (!feature?.properties) return
            const sourcePinId = Number(feature.properties.source_pin_id)
            const targetPinId = Number(feature.properties.target_pin_id)
            const otherPinId = resolveOtherPinIdFromLink(
              sourcePinId,
              targetPinId,
              detailPinIdRef.current,
            )
            const pin = pinsByIdRef.current.get(otherPinId)
            if (!pin) return
            onNavigateToPinRef.current?.(otherPinId)
            selectPin(map, pin, { flyTo: true })
          }

          const setPointerCursor = () => {
            map.getCanvas().style.cursor = "pointer"
          }
          const clearPointerCursor = () => {
            map.getCanvas().style.cursor = ""
          }

          // Single map-level handler avoids matching↔dimmed mouseleave races that
          // schedule hide after the other layer already claimed a new pin.
          const handlePinHoverMove = (e: maplibregl.MapMouseEvent) => {
            if (!isDesktopRef.current || placementActiveRef.current) {
              clearHoverTooltipRef.current()
              clearPointerCursor()
              return
            }
            const pinId = pinIdFromTopFeatureAt(map, e.point)
            if (pinId == null) {
              clearHoverTooltipRef.current()
              clearPointerCursor()
              return
            }
            const pin = pinsByIdRef.current.get(pinId)
            if (!pin) {
              clearHoverTooltipRef.current()
              clearPointerCursor()
              return
            }
            setPointerCursor()
            showHoverTooltipRef.current(map, pin)
          }

          const handleCanvasMouseLeave = () => {
            clearHoverTooltipRef.current()
            clearPointerCursor()
          }

          pinLayerHandlersRef.current = {
            handlePinIconClick,
            handleClusterClick,
            handlePinHoverMove,
            handleCanvasMouseLeave,
            setPointerCursor,
            clearPointerCursor,
          }

          pinLinkLayerHandlersRef.current = {
            handlePinLinkClick,
            setPointerCursor,
            clearPointerCursor,
          }

          map.on("click", "pin-icons-layer", handlePinIconClick)
          map.on("click", "pin-icons-dimmed-layer", handlePinIconClick)
          map.on("click", PIN_ICONS_SELECTED_LAYER_ID, handlePinIconClick)
          map.on("click", "pin-clusters-layer", handleClusterClick)
          map.on("click", "pin-cluster-count-layer", handleClusterClick)
          map.on("mousemove", handlePinHoverMove)
          map.getCanvas().addEventListener("mouseleave", handleCanvasMouseLeave)
          map.on("mouseenter", "pin-clusters-layer", setPointerCursor)
          map.on("mouseleave", "pin-clusters-layer", clearPointerCursor)
          map.on("mouseenter", "pin-cluster-count-layer", setPointerCursor)
          map.on("mouseleave", "pin-cluster-count-layer", clearPointerCursor)
          map.on("click", PIN_LINKS_LAYER_ID, handlePinLinkClick)
          map.on("mouseenter", PIN_LINKS_LAYER_ID, setPointerCursor)
          map.on("mouseleave", PIN_LINKS_LAYER_ID, clearPointerCursor)

          pinLayersAddedRef.current = true

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
      pinLinkLayerAddedRef.current = false
      lastPinGeoJsonSyncKeyRef.current = ""
      lastPinLinkSyncKeyRef.current = ""
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
        map.off("click", PIN_ICONS_SELECTED_LAYER_ID, pinHandlers.handlePinIconClick)
        map.off("click", "pin-clusters-layer", pinHandlers.handleClusterClick)
        map.off("click", "pin-cluster-count-layer", pinHandlers.handleClusterClick)
        map.off("mousemove", pinHandlers.handlePinHoverMove)
        map.getCanvas().removeEventListener("mouseleave", pinHandlers.handleCanvasMouseLeave)
        map.off("mouseenter", "pin-clusters-layer", pinHandlers.setPointerCursor)
        map.off("mouseleave", "pin-clusters-layer", pinHandlers.clearPointerCursor)
        map.off("mouseenter", "pin-cluster-count-layer", pinHandlers.setPointerCursor)
        map.off("mouseleave", "pin-cluster-count-layer", pinHandlers.clearPointerCursor)
        pinLayerHandlersRef.current = null
      }
      const pinLinkHandlers = pinLinkLayerHandlersRef.current
      if (map && pinLinkHandlers) {
        map.off("click", PIN_LINKS_LAYER_ID, pinLinkHandlers.handlePinLinkClick)
        map.off("mouseenter", PIN_LINKS_LAYER_ID, pinLinkHandlers.setPointerCursor)
        map.off("mouseleave", PIN_LINKS_LAYER_ID, pinLinkHandlers.clearPointerCursor)
        pinLinkLayerHandlersRef.current = null
      }
      clearHoverTooltipRef.current()
      pendingMarkerRef.current?.remove()
      pendingMarkerRef.current = null
      geolocateControlRef.current = null
      knownCustomImageIdsRef.current = new Set()
      customImageVisualKeysRef.current = new Map()
      customImagesReadyRef.current = false
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
    if (!mapReady || initialGeolocateTriggeredRef.current) return
    // Landing on ?pin= or a pending camera request: never auto-geolocate this session.
    if (cameraRequest != null || parsePinIdFromSearch() != null) {
      initialGeolocateTriggeredRef.current = true
      return
    }
    const map = mapRef.current
    if (!map || !navigator.geolocation) return

    let cancelled = false
    initialGeolocateTriggeredRef.current = true

    navigator.geolocation.getCurrentPosition(
      (position) => {
        cacheDeviceLocation(position.coords)
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
  }, [mapReady, cameraRequest])

  // Pending location: actual pin (highlighted) + flyTo
  const pendingPinTypeRef = useRef<PinType | null>(null)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    if (pendingLocation) {
      map.flyTo({
        center: [pendingLocation.lng, pendingLocation.lat],
        zoom: PIN_FOCUS_ZOOM,
        padding: mapPaddingForPinPanel(map, pinPanelOpenRef.current),
      })
      const pinType: PinType = pendingPinType ?? DEFAULT_BUILTIN_PIN_TYPE
      const typeChanged = pendingPinTypeRef.current !== pinType
      if (!pendingMarkerRef.current || typeChanged) {
        pendingMarkerRef.current?.remove()
        pendingMarkerRef.current = null
        pendingPinTypeRef.current = pinType
        const el = createPinTypeMarkerElement(pinType, catalogRef.current, true)
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

  usePinPanelCamera({
    mapRef,
    mapReady,
    pinPanelOpen,
    pinPanelOpenRef,
    detailPinId,
    pendingLocation,
    pinsByIdRef,
    pinsRef,
  })

  // Keep camera focus tracking in sync with the detail panel pin.
  useEffect(() => {
    focusedPinIdRef.current = detailPinId
    if (detailPinId == null) setFocusedBacklinks(null)
  }, [detailPinId])

  // Recompute which labels to hide when the camera moves (screen overlap depends on zoom).
  useEffect(() => {
    if (!mapReady || detailPinId == null) return
    const map = mapRef.current
    if (!map) return
    const refreshLabels = () => {
      lastPinGeoJsonSyncKeyRef.current = ""
      syncPinGeoJsonRef.current()
    }
    map.on("moveend", refreshLabels)
    return () => {
      map.off("moveend", refreshLabels)
    }
  }, [mapReady, detailPinId])

  const savedFilterEmptyOnMap =
    filter.heartedOnly &&
    heartedPinIds.size > 0 &&
    !pinsForMap.some((p) => heartedPinIds.has(p.id))

  // Register custom marker images (normal + new + selected) so icons exist before GeoJSON sync.
  useEffect(() => {
    if (!mapReady || !pinLayersAddedRef.current) return
    const map = mapRef.current
    if (!map) return

    // Block the GeoJSON effect until this run finishes (same commit: this effect runs first).
    customImagesReadyRef.current = false
    let cancelled = false

    const run = async () => {
      const result = await registerCustomPinImages({
        map,
        catalog: catalogRef.current,
        knownCustomImageIds: knownCustomImageIdsRef.current,
        customImageVisualKeys: customImageVisualKeysRef.current,
        isCancelled: () => cancelled || mapRef.current !== map,
      })
      if (!result || cancelled) return
      knownCustomImageIdsRef.current = result.knownCustomImageIds
      customImageVisualKeysRef.current = result.customImageVisualKeys
      customImagesReadyRef.current = true
      // Sync after icons exist (covers catalog change and any GeoJSON sync skipped while pending).
      lastPinGeoJsonSyncKeyRef.current = ""
      syncPinGeoJsonRef.current()
    }

    void run()
    return () => {
      cancelled = true
      customImagesReadyRef.current = false
    }
  }, [catalog, mapReady])

  // Sync pin GeoJSON when pin/filter/selection data changes (after custom images are ready).
  useEffect(() => {
    if (!mapReady || !pinLayersAddedRef.current) return
    if (!customImagesReadyRef.current) return
    syncPinGeoJsonRef.current()
  }, [pinGeoJsonSyncKey, mapReady])

  // One-shot camera for URL/nav focus (App already opened the pin via onView).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || cameraRequest == null) return
    if (lastCameraRequestTokenRef.current === cameraRequest.token) return

    const pin = pins.find((p) => p.id === cameraRequest.pinId)
    if (!pin) return

    lastCameraRequestTokenRef.current = cameraRequest.token
    focusedPinIdRef.current = pin.id
    flyToPin(map, pin)
    onCameraRequestConsumedRef.current?.()
  }, [cameraRequest, pins, mapReady])

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
              <Button type="button" variant="primary" size="sm" onClick={() => window.location.reload()}>
                Reload
              </Button>
            </div>
          </div>
        </div>
      )}
      {mapReady && !drawerOpen && (
        <div
          className={[
            "absolute right-2 z-10 flex flex-col items-end gap-2 pointer-events-none",
            searchActive && "max-sm:hidden",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            top: mapShellTopRightOverlayTop(),
            bottom: mapShellOverlayBottomAboveHelp(),
          }}
        >
          <div className="pointer-events-auto shrink-0">
            <PinConnectionsToggle
              pressed={showConnections}
              onToggle={handleConnectionsToggle}
              globalCapped={showConnections && pinLinkBuildResult.globalCapped}
            />
          </div>
          <div className="pointer-events-none min-h-0 flex-1 flex flex-col items-end overflow-hidden">
            <MapFilters
              pins={pins}
              filter={filter}
              setFilter={setFilter}
              openRef={filterPanelOpenRef}
              position="inline"
              panelTopOffset="0"
              showSavedFilter={userId != null}
              pinHeartsLoading={pinHeartsLoading}
              savedFilterEmptyOnMap={savedFilterEmptyOnMap}
            />
          </div>
        </div>
      )}
      {mapReady && !drawerOpen && (
        <MapSearch
          pins={pins}
          filter={filter}
          setFilter={setFilter}
          onFocusChange={setSearchActive}
          pinMatches={pinFilterMatcher}
          onSelectPin={(pin) => {
            const map = mapRef.current
            if (!map) return
            selectPin(map, pin, { flyTo: true })
          }}
          onSelectPlace={(place: PlaceSuggestion) => {
            const map = mapRef.current
            if (!map) return
            const panelPadding = mapPaddingForPinPanel(map, pinPanelOpenRef.current)
            if (place.bbox) {
              map.fitBounds(
                [
                  [place.bbox[0], place.bbox[1]],
                  [place.bbox[2], place.bbox[3]],
                ],
                {
                  padding: {
                    top: 48 + (panelPadding.top ?? 0),
                    bottom: 48 + (panelPadding.bottom ?? 0),
                    left: 48 + (panelPadding.left ?? 0),
                    right: 48 + (panelPadding.right ?? 0),
                  },
                  maxZoom: PIN_FOCUS_ZOOM,
                  duration: 1000,
                },
              )
            } else {
              map.flyTo({
                center: [place.longitude, place.latitude],
                zoom: PIN_FOCUS_ZOOM,
                padding: panelPadding,
              })
            }
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

