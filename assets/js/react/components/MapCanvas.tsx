import React, { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import maplibregl, { Map as MLMap, Marker, Popup } from "maplibre-gl"
import type { Pin, PinLink, PinType } from "../types"
import { getPinBacklinks } from "../api/client"
import { BUILTIN_PIN_TYPES, DEFAULT_BUILTIN_PIN_TYPE } from "../utils/builtinPinType"
import {
  createPinTypeMarkerElement,
  createPinTypeMarkerSVG,
  getPinTypeMarkerImageId,
} from "../utils/pinTypeIcons"
import { PinTypesProvider, usePinTypes } from "../context/PinTypesContext"
import { CLEARED_FILTER, buildMapFilterSyncKey, createPinFilterMatcher, type FilterState } from "./map/filters"
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
  pinIconLayout,
  pinLabelsVisibleFilter,
} from "./map/mapPinFeatures"
import { takeLastVisitWatermark } from "../utils/mapLastVisit"
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
import PinMiniPopup from "./map/PinMiniPopup"
import PinHoverTooltip from "./map/PinHoverTooltip"
import { shouldShowPinHoverTooltip } from "./map/pinHoverVisibility"
import MapFilters from "./MapFilters"
import PinConnectionsToggle from "./PinConnectionsToggle"
import MapSearch from "./MapSearch"
import Button from "./ui/Button"
import {
  DESKTOP_PIN_PANEL_PADDING_DURATION_MS,
  desktopPinPanelMapPaddingRight,
  mapShellOverlayBottomAboveHelp,
  mapShellTopRightOverlayTop,
} from "../utils/siteLayout"
import {
  PIN_PANEL_EDGE_MARGIN_PX,
  zoomToKeepPointInPaddedViewport,
} from "./map/pinPanelCamera"

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Failed to load pin image"))
    img.src = dataUrl
  })
}

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
  initialPinId?: number | null
  /** Bumped on each in-app pin link navigation so repeat clicks to the same pin still focus it. */
  pinFocusSeq?: number
  isDesktop?: boolean
  /** Pin id currently shown in the detail panel (view or edit); drives desktop mini popup. */
  detailPinId?: number | null
  /** Desktop right-rail open — shifts MapLibre padding so the globe sits in the visible area. */
  pinPanelOpen?: boolean
  /** Hide the mini popup while placing a pin. */
  hideMiniPopup?: boolean
  onMapClick: (lng: number, lat: number) => void
  onOpenPin: (pinId: number) => void
  /** Dismiss pin detail panel / mini popup (e.g. empty map click). */
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
  initialPinId = null,
  pinFocusSeq = 0,
  isDesktop = false,
  detailPinId = null,
  pinPanelOpen = false,
  hideMiniPopup = false,
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
  const lastPinFocusSeqRef = useRef(0)
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
  const panelCameraBackupRef = useRef<{
    center: maplibregl.LngLat
    zoom: number
    bearing: number
    pitch: number
  } | null>(null)
  const isDesktopRef = useRef(isDesktop)
  isDesktopRef.current = isDesktop
  const hideMiniPopupRef = useRef(hideMiniPopup)
  hideMiniPopupRef.current = hideMiniPopup
  const onDismissPinDetailRef = useRef(onDismissPinDetail)
  onDismissPinDetailRef.current = onDismissPinDetail
  const openPopupRef = useRef<Popup | null>(null)
  const openPopupPinIdRef = useRef<number | null>(null)
  const popupRootRef = useRef<ReturnType<typeof createRoot> | null>(null)
  const hoverPopupRef = useRef<Popup | null>(null)
  const hoverPinIdRef = useRef<number | null>(null)
  const hoverRootRef = useRef<ReturnType<typeof createRoot> | null>(null)
  const clearHoverTooltipRef = useRef<() => void>(() => { })
  const onHoverPopupLeave = useRef(() => {
    clearHoverTooltipRef.current()
  }).current
  const geolocateControlRef = useRef<InstanceType<typeof maplibregl.GeolocateControl> | null>(null)
  const initialGeolocateTriggeredRef = useRef(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapInitError, setMapInitError] = useState<string | null>(null)
  /** Previous visit watermark for this map scope; null on first visit. */
  const [lastVisitWatermark, setLastVisitWatermark] = useState<Date | null>(() =>
    takeLastVisitWatermark(mapScopeKey),
  )
  const [showConnections, setShowConnections] = useState(() => readShowConnectionsPreference())
  const [openPopupPinId, setOpenPopupPinId] = useState<number | null>(null)
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
    handleCanvasMouseLeave: (e: MouseEvent) => void
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
    () => buildPinGeoJsonSyncKey(pinsForMap, filterSyncKey, catalog, lastVisitWatermarkMs),
    [pinsForMap, filterSyncKey, catalog, lastVisitWatermarkMs],
  )
  const pinLinkBuildParams = useMemo(
    () => ({
      pins: pinsForMap,
      catalog,
      focusPinId: openPopupPinId,
      backlinks: focusedBacklinks,
      showConnections,
      pinMatches: pinFilterMatcher,
      filterSyncKey,
    }),
    [pinsForMap, catalog, openPopupPinId, focusedBacklinks, showConnections, pinFilterMatcher, filterSyncKey],
  )
  const pinLinkBuildResult = useMemo(
    () => buildPinLinkGeoJson(pinLinkBuildParams),
    [pinLinkBuildParams],
  )
  const pinLinkSyncKey = useMemo(
    () => buildPinLinkSyncKey(pinLinkBuildParams),
    [pinLinkBuildParams],
  )

  function clearPopupState(): void {
    const root = popupRootRef.current
    openPopupRef.current = null
    openPopupPinIdRef.current = null
    setOpenPopupPinId(null)
    setFocusedBacklinks(null)
    popupRootRef.current = null
    root?.unmount()
  }

  function closeOpenPopup(): void {
    const popup = openPopupRef.current
    clearPopupState()
    popup?.remove()
  }

  function clearHoverTooltip(): void {
    const root = hoverRootRef.current
    const popup = hoverPopupRef.current
    const el = popup?.getElement()
    if (el) {
      el.removeEventListener("mouseleave", onHoverPopupLeave)
    }
    hoverPopupRef.current = null
    hoverPinIdRef.current = null
    hoverRootRef.current = null
    root?.unmount()
    popup?.remove()
  }
  clearHoverTooltipRef.current = clearHoverTooltip

  function isPointerOverHoverPopup(target: EventTarget | null): boolean {
    if (!(target instanceof Node)) return false
    const el = hoverPopupRef.current?.getElement()
    return el != null && el.contains(target)
  }

  function trackFocusedPin(pinId: number | null): void {
    openPopupPinIdRef.current = pinId
    setOpenPopupPinId(pinId)
    if (pinId != null) {
      focusedPinIdRef.current = pinId
    } else {
      setFocusedBacklinks(null)
    }
  }

  function renderMiniPopupContent(pin: Pin) {
    return (
      <PinTypesProvider catalog={catalogRef.current} enabledBuiltins={enabledBuiltinsRef.current}>
        <PinMiniPopup pin={pin} />
      </PinTypesProvider>
    )
  }

  function renderHoverTooltipContent(pin: Pin, onReady?: () => void) {
    return (
      <PinTypesProvider catalog={catalogRef.current} enabledBuiltins={enabledBuiltinsRef.current}>
        <PinHoverTooltip
          pin={pin}
          onReady={onReady}
          onOpen={() => {
            const map = mapRef.current
            if (!map) return
            selectPin(map, pin)
          }}
        />
      </PinTypesProvider>
    )
  }

  function showHoverTooltip(map: MLMap, pin: Pin): void {
    if (
      !shouldShowPinHoverTooltip({
        isDesktop: isDesktopRef.current,
        hideMiniPopup: hideMiniPopupRef.current,
        detailPinId: detailPinIdRef.current ?? null,
        hoverPinId: pin.id,
      })
    ) {
      clearHoverTooltip()
      return
    }

    if (hoverPopupRef.current && hoverPinIdRef.current === pin.id && hoverRootRef.current) {
      hoverRootRef.current.render(renderHoverTooltipContent(pin))
      hoverPopupRef.current.setLngLat([pin.longitude, pin.latitude])
      return
    }

    clearHoverTooltip()

    const container = document.createElement("div")
    const root = createRoot(container)
    // Anchor top so the tooltip hangs below the pin and stays out of the drag path.
    const popup = new Popup({
      className: "pin-hover-popup",
      closeButton: false,
      locationOccludedOpacity: 0.7,
      maxWidth: "20rem",
      closeOnClick: false,
      anchor: "top",
    })
      .setLngLat([pin.longitude, pin.latitude])
      .setDOMContent(container)
      .addTo(map)
    // Hide empty MapLibre chrome until React has painted the full tooltip.
    const popupEl = popup.getElement()
    if (popupEl) {
      popupEl.style.visibility = "hidden"
      popupEl.addEventListener("mouseleave", onHoverPopupLeave)
    }
    root.render(
      renderHoverTooltipContent(pin, () => {
        if (hoverPopupRef.current !== popup) return
        popupEl?.style.removeProperty("visibility")
      }),
    )
    hoverPopupRef.current = popup
    hoverPinIdRef.current = pin.id
    hoverRootRef.current = root
  }

  function showDesktopMiniPopup(map: MLMap, pin: Pin): void {
    clearHoverTooltip()
    if (openPopupRef.current) {
      closeOpenPopup()
    }
    const container = document.createElement("div")
    const root = createRoot(container)
    root.render(renderMiniPopupContent(pin))
    const popup = new Popup({
      closeButton: false,
      locationOccludedOpacity: 0.7,
      maxWidth: "20rem",
      closeOnClick: false,
    })
      .setLngLat([pin.longitude, pin.latitude])
      .setDOMContent(container)
      .addTo(map)
    openPopupRef.current = popup
    openPopupPinIdRef.current = pin.id
    setOpenPopupPinId(pin.id)
    popupRootRef.current = root
    popup.on("close", () => {
      if (openPopupRef.current === popup) clearPopupState()
    })
  }

  function mapPaddingForPinPanel(map: MLMap, panelOpen: boolean): maplibregl.PaddingOptions {
    const right = desktopPinPanelMapPaddingRight(map.getContainer().clientWidth, panelOpen)
    return { top: 0, bottom: 0, left: 0, right }
  }

  function selectPin(map: MLMap, pin: Pin, opts?: { flyTo?: boolean }): void {
    focusedPinIdRef.current = pin.id
    if (opts?.flyTo) {
      // Opening a pin shows the desktop panel; include padding so the pin centers
      // in the visible area (even before pinPanelOpen prop updates).
      map.flyTo({
        center: [pin.longitude, pin.latitude],
        zoom: PIN_FOCUS_ZOOM,
        padding: mapPaddingForPinPanel(map, isDesktopRef.current),
      })
    }
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
    )
    if (syncKey === lastPinGeoJsonSyncKeyRef.current) return

    lastPinGeoJsonSyncKeyRef.current = syncKey
    pinsByIdRef.current = new Map(pins.map((p) => [p.id, p]))

    const featureSets = buildPinFeatureSets(
      pins,
      pinFilterMatcherRef.current,
      catalogSnapshot,
      watermark,
    )
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
    if (!showConnections || openPopupPinId == null) {
      setFocusedBacklinks(null)
      return
    }
    let cancelled = false
    setFocusedBacklinks(null)
    getPinBacklinks(openPopupPinId)
      .then(({ data }) => {
        if (!cancelled) setFocusedBacklinks(data)
      })
      .catch(() => {
        if (!cancelled) setFocusedBacklinks([])
      })
    return () => {
      cancelled = true
    }
  }, [showConnections, openPopupPinId])

  const handleConnectionsToggle = () => {
    setShowConnections((prev) => {
      const next = !prev
      writeShowConnectionsPreference(next)
      return next
    })
  }

  useEffect(() => {
    focusedPinIdRef.current = null
    lastPinFocusSeqRef.current = 0
    lastPinGeoJsonSyncKeyRef.current = ""
    lastPinLinkSyncKeyRef.current = ""
    setLastVisitWatermark(takeLastVisitWatermark(mapScopeKey))
    setFocusedBacklinks(null)
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

        // Empty map click dismisses open pin detail (panel + mini popup)
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
            for (const outline of [undefined, "new"] as const) {
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
              openPopupPinIdRef.current,
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
            if (!isDesktopRef.current || hideMiniPopupRef.current) {
              if (hoverPinIdRef.current != null) clearHoverTooltip()
              return
            }
            const pinId = pinIdFromTopFeatureAt(map, e.point)
            if (pinId == null) {
              clearHoverTooltip()
              return
            }
            const pin = pinsByIdRef.current.get(pinId)
            if (!pin) {
              clearHoverTooltip()
              return
            }
            map.getCanvas().style.cursor = "pointer"
            showHoverTooltip(map, pin)
          }

          const handleCanvasMouseLeave = (e: MouseEvent) => {
            // Keep tooltip if the pointer moved onto it; otherwise close immediately.
            if (isPointerOverHoverPopup(e.relatedTarget)) return
            clearHoverTooltip()
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
      clearHoverTooltip()
      closeOpenPopup()
      pendingMarkerRef.current?.remove()
      pendingMarkerRef.current = null
      geolocateControlRef.current = null
      knownCustomImageIdsRef.current = new Set()
      customImageVisualKeysRef.current = new Map()
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

  // Shift the globe left when the desktop pin panel covers the right side.
  // Zoom out if the focused pin would leave the visible area; restore zoom on close.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const zeroPadding = { top: 0, bottom: 0, left: 0, right: 0 }

    const focusLngLat = (): [number, number] | null => {
      if (detailPinId != null) {
        const pin =
          pinsByIdRef.current.get(detailPinId) ??
          pinsRef.current.find((p) => p.id === detailPinId)
        if (pin) return [pin.longitude, pin.latitude]
      }
      if (pendingLocation) return [pendingLocation.lng, pendingLocation.lat]
      return null
    }

    const applyPanelCamera = (animate: boolean) => {
      const padding = mapPaddingForPinPanel(map, true)
      const mapWidth = map.getContainer().clientWidth
      const mapHeight = map.getContainer().clientHeight
      const panelPadding = {
        top: padding.top ?? 0,
        right: padding.right ?? 0,
        bottom: padding.bottom ?? 0,
        left: padding.left ?? 0,
      }

      let zoom = map.getZoom()
      const lngLat = focusLngLat()
      if (lngLat) {
        const sample = {
          center: map.getCenter(),
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
          padding: map.getPadding(),
        }
        // Sample with the real globe transform (jumpTo is sync; restore before paint).
        zoom = zoomToKeepPointInPaddedViewport({
          mapWidth,
          mapHeight,
          padding: panelPadding,
          margin: PIN_PANEL_EDGE_MARGIN_PX,
          currentZoom: sample.zoom,
          minZoom: map.getMinZoom(),
          projectAtZoom: (z) => {
            map.jumpTo({
              center: sample.center,
              zoom: z,
              bearing: sample.bearing,
              pitch: sample.pitch,
              padding: panelPadding,
            })
            const p = map.project(lngLat)
            return { x: p.x, y: p.y }
          },
        })
        map.jumpTo({
          center: sample.center,
          zoom: sample.zoom,
          bearing: sample.bearing,
          pitch: sample.pitch,
          padding: sample.padding,
        })
      }

      const current = map.getPadding()
      const samePadding =
        Math.abs((current.top ?? 0) - panelPadding.top) < 1 &&
        Math.abs((current.right ?? 0) - panelPadding.right) < 1 &&
        Math.abs((current.bottom ?? 0) - panelPadding.bottom) < 1 &&
        Math.abs((current.left ?? 0) - panelPadding.left) < 1
      const sameZoom = Math.abs(map.getZoom() - zoom) < 0.01
      if (samePadding && sameZoom) return

      if (animate) {
        map.easeTo({ padding: panelPadding, zoom, duration: DESKTOP_PIN_PANEL_PADDING_DURATION_MS })
      } else {
        map.jumpTo({ padding: panelPadding, zoom })
      }
    }

    const clearPanelCamera = (animate: boolean) => {
      const backup = panelCameraBackupRef.current
      panelCameraBackupRef.current = null
      const padding = zeroPadding
      const zoom = backup?.zoom ?? map.getZoom()
      const current = map.getPadding()
      const samePadding =
        Math.abs((current.top ?? 0) - padding.top) < 1 &&
        Math.abs((current.right ?? 0) - padding.right) < 1 &&
        Math.abs((current.bottom ?? 0) - padding.bottom) < 1 &&
        Math.abs((current.left ?? 0) - padding.left) < 1
      const sameZoom = Math.abs(map.getZoom() - zoom) < 0.01
      if (samePadding && sameZoom) return

      if (animate) {
        map.easeTo({ padding, zoom, duration: DESKTOP_PIN_PANEL_PADDING_DURATION_MS })
      } else {
        map.jumpTo({ padding, zoom })
      }
    }

    if (pinPanelOpen) {
      if (!panelCameraBackupRef.current) {
        panelCameraBackupRef.current = {
          center: map.getCenter(),
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        }
      }
      applyPanelCamera(true)
    } else {
      clearPanelCamera(true)
    }

    const onResize = () => {
      if (pinPanelOpenRef.current) applyPanelCamera(false)
    }
    map.on("resize", onResize)
    return () => {
      map.off("resize", onResize)
    }
  }, [pinPanelOpen, mapReady, detailPinId, pendingLocation])

  // Sync desktop mini popup with detail panel pin.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const shouldShow = isDesktop && !hideMiniPopup && detailPinId != null

    if (!shouldShow) {
      if (openPopupRef.current) closeOpenPopup()
      // Keep focus tracking for link highlighting when detail is open without a mini popup
      // (mobile view modal, or desktop edit).
      trackFocusedPin(detailPinId)
      return
    }

    const pin = pins.find((p) => p.id === detailPinId)
    if (!pin) {
      closeOpenPopup()
      return
    }

    focusedPinIdRef.current = pin.id

    if (openPopupRef.current && openPopupPinIdRef.current === pin.id && popupRootRef.current) {
      clearHoverTooltip()
      popupRootRef.current.render(renderMiniPopupContent(pin))
      openPopupRef.current.setLngLat([pin.longitude, pin.latitude])
      setOpenPopupPinId(pin.id)
      return
    }

    showDesktopMiniPopup(map, pin)
  }, [detailPinId, hideMiniPopup, isDesktop, pins, mapReady, catalog, enabledBuiltins])

  // Drop hover tooltip when desktop/placement/selection suppress it.
  useEffect(() => {
    if (!isDesktop || hideMiniPopup) {
      clearHoverTooltip()
      return
    }
    if (detailPinId != null && hoverPinIdRef.current === detailPinId) {
      clearHoverTooltip()
    }
  }, [isDesktop, hideMiniPopup, detailPinId])

  const savedFilterEmptyOnMap =
    filter.heartedOnly &&
    heartedPinIds.size > 0 &&
    !pinsForMap.some((p) => heartedPinIds.has(p.id))

  // Register custom marker images (normal + new), then sync GeoJSON so icons exist first.
  useEffect(() => {
    if (!mapReady || !pinLayersAddedRef.current) return
    const map = mapRef.current
    if (!map) return

    let cancelled = false

    const run = async () => {
      const catalogSnapshot = catalogRef.current
      const nextIds = new Set<string>()
      const nextVisualKeys = new Map<string, string>()
      for (const pinType of catalogSnapshot) {
        const visualKey = `${pinType.marker_color ?? ""}:${pinType.icon ?? ""}`
        for (const outline of [undefined, "new"] as const) {
          const imageId = getPinTypeMarkerImageId(pinType.pin_type, outline)
          nextIds.add(imageId)
          nextVisualKeys.set(imageId, visualKey)
          const visualChanged = customImageVisualKeysRef.current.get(imageId) !== visualKey
          if (map.hasImage(imageId) && !visualChanged) continue
          try {
            const dataUrl = createPinTypeMarkerSVG(pinType.pin_type, catalogSnapshot, outline)
            const img = await loadImage(dataUrl)
            if (cancelled || mapRef.current !== map) return
            if (map.hasImage(imageId)) map.removeImage(imageId)
            map.addImage(imageId, img)
          } catch {
            // ignore failed custom marker images
          }
        }
      }
      if (cancelled) return
      for (const imageId of knownCustomImageIdsRef.current) {
        if (!nextIds.has(imageId) && map.hasImage(imageId)) {
          map.removeImage(imageId)
        }
      }
      knownCustomImageIdsRef.current = nextIds
      customImageVisualKeysRef.current = nextVisualKeys
      syncPinGeoJsonRef.current()
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [pinGeoJsonSyncKey, catalog, mapReady])

  // Deep-link / repeat navigation to a specific pin.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || initialPinId == null) return

    const focusRequested = pinFocusSeq !== lastPinFocusSeqRef.current
    const pinChanged = initialPinId !== focusedPinIdRef.current
    if (!focusRequested && !pinChanged) return

    // Do not re-open when pins refresh from remote marker_updated events while focused.
    if (!focusRequested && detailPinId === initialPinId) return

    // detailPinId already moved (click/tooltip) while initialPinId is stale — URL sync
    // must not yank selection back to the previous pin.
    if (!focusRequested && detailPinId != null && detailPinId !== initialPinId) return

    if (focusRequested) lastPinFocusSeqRef.current = pinFocusSeq
    const pin = pins.find((p) => p.id === initialPinId)
    if (!pin) return

    // clear all filters in case the pin is not shown in the initial filters
    setFilter(CLEARED_FILTER)
    selectPin(map, pin, { flyTo: true })
  }, [initialPinId, pinFocusSeq, pins, mapReady, setFilter, detailPinId])

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
                    top: 48 + panelPadding.top,
                    bottom: 48 + panelPadding.bottom,
                    left: 48 + panelPadding.left,
                    right: 48 + panelPadding.right,
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

