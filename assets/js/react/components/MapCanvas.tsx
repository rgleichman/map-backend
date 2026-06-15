import React, { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import maplibregl, { Map as MLMap, Marker, Popup } from "maplibre-gl"
import type { Pin, PinType } from "../types"
import {
  createPinTypeMarkerElement,
  createPinTypeMarkerSVG,
  getPinTypeConfig,
  getPinTypeMarkerImageId,
  PIN_TYPES
} from "../utils/pinTypeIcons"
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
import { mapShellTopRightOverlayTop } from "../utils/siteLayout"
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
const CLUSTER_MAX_ZOOM = 15

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

function toPinFeature(pin: Pin) {
  const pinColor = getPinTypeConfig(pin.pin_type).color
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

function buildPinFeatureSets(pinList: Pin[], filterState: FilterState) {
  const matching: ReturnType<typeof toPinFeature>[] = []
  const dimmed: ReturnType<typeof toPinFeature>[] = []
  for (const pin of pinList) {
    const feature = toPinFeature(pin)
    if (pinMatchesFilter(pin, filterState)) matching.push(feature)
    else dimmed.push(feature)
  }
  return { matching, dimmed }
}

type Props = {
  /** Changes when switching world ↔ community map; resets deep-link pin handling. */
  mapScopeKey?: string
  styleUrl: string
  pins: Pin[]
  initialPinId?: number | null
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
}

export default function MapCanvas({
  mapScopeKey = "world",
  styleUrl,
  pins,
  initialPinId = null,
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
}: Props) {
  const mapRef = useRef<MLMap | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pendingMarkerRef = useRef<Marker | null>(null)
  const initialPinIdAppliedRef = useRef(false)
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
  const [searchActive, setSearchActive] = useState(false)
  const filterPanelOpenRef = useRef<{ open(): void } | null>(null)
  const searchDismissingClickRef = useRef(false)
  const mapMouseDownHandlerRef = useRef<(() => void) | null>(null)
  const filterRef = useRef(filter)
  filterRef.current = filter

  const pinsForMap =
    editingPinId != null ? pins.filter((p) => p.id !== editingPinId) : pins
  const pinsForMapRef = useRef<Pin[]>(pinsForMap)
  pinsForMapRef.current = pinsForMap

  useEffect(() => {
    initialPinIdAppliedRef.current = false
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
    const onFocus = () => setSearchActive(true)
    const onBlur = () => setTimeout(() => setSearchActive(false), 150)
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
        positionOptions: { enableHighAccuracy: false },
        trackUserLocation: false
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
        if (!map) return
        try {
          for (const pinType of PIN_TYPES) {
            const dataUrl = createPinTypeMarkerSVG(pinType)
            const img = await loadImage(dataUrl)
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
              "text-allow-overlap": false,
              "text-ignore-placement": false,
            },
            paint: {
              "text-color": "#1f2937",
              "text-halo-color": ["get", "haloColor"],
              "text-halo-width": 1.7,
            },
          })
          pinLayersAddedRef.current = true

          const initialPins = pinsForMapRef.current
          pinsByIdRef.current = new Map(initialPins.map((p) => [p.id, p]))
          const initialFeatureSets = buildPinFeatureSets(initialPins, filterRef.current)
            ; (map.getSource(MATCHING_SOURCE_ID) as maplibregl.GeoJSONSource).setData({
              type: "FeatureCollection",
              features: initialFeatureSets.matching,
            })
            ; (map.getSource(DIMMED_SOURCE_ID) as maplibregl.GeoJSONSource).setData({
              type: "FeatureCollection",
              features: initialFeatureSets.dimmed,
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

          map.on("click", "pin-icons-layer", handlePinIconClick)
          map.on("click", "pin-icons-dimmed-layer", handlePinIconClick)
          map.on("click", "pin-clusters-layer", handleClusterClick)
          map.on("click", "pin-cluster-count-layer", handleClusterClick)
          const setPointerCursor = () => {
            map.getCanvas().style.cursor = "pointer"
          }
          const clearPointerCursor = () => {
            map.getCanvas().style.cursor = ""
          }
          map.on("mouseenter", "pin-icons-layer", setPointerCursor)
          map.on("mouseleave", "pin-icons-layer", clearPointerCursor)
          map.on("mouseenter", "pin-icons-dimmed-layer", setPointerCursor)
          map.on("mouseleave", "pin-icons-dimmed-layer", clearPointerCursor)
          map.on("mouseenter", "pin-clusters-layer", setPointerCursor)
          map.on("mouseleave", "pin-clusters-layer", clearPointerCursor)
          map.on("mouseenter", "pin-cluster-count-layer", setPointerCursor)
          map.on("mouseleave", "pin-cluster-count-layer", clearPointerCursor)

          setMapReady(true)
        } catch (err) {
          console.error("Failed to set up pin layers", err)
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
      initialGeolocateTriggeredRef.current = false
      const map = mapRef.current
      const handler = mapMouseDownHandlerRef.current
      if (map && handler) {
        map.getContainer().removeEventListener("mousedown", handler)
        mapMouseDownHandlerRef.current = null
      }
      pendingMarkerRef.current?.remove()
      pendingMarkerRef.current = null
      geolocateControlRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
      setMapReady(false)
      setMapInitError(null)
    }
  }, [styleUrl])

  // Center on user location once on first load (skip when opening a shared pin link)
  useEffect(() => {
    if (!mapReady || initialPinId != null || initialGeolocateTriggeredRef.current) return
    const control = geolocateControlRef.current
    if (!control) return
    initialGeolocateTriggeredRef.current = true
    control.trigger()
  }, [mapReady, initialPinId])

  // Pending location: actual pin (highlighted) + flyTo
  const pendingPinTypeRef = useRef<PinType | null>(null)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    if (pendingLocation) {
      map.flyTo({ center: [pendingLocation.lng, pendingLocation.lat], zoom: 14 })
      const pinType: PinType = pendingPinType ?? "one_time"
      const typeChanged = pendingPinTypeRef.current !== pinType
      if (!pendingMarkerRef.current || typeChanged) {
        pendingMarkerRef.current?.remove()
        pendingMarkerRef.current = null
        pendingPinTypeRef.current = pinType
        const el = createPinTypeMarkerElement(pinType, { pending: true })
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

  function openPinPopup(map: MLMap, pin: Pin): void {
    onPopupOpenRef.current?.(pin.id)
    const container = document.createElement("div")
    const root = createRoot(container)
    root.render(
      <PopupContent
        pin={pin}
        csrfToken={csrfToken}
        communityUrl={communityUrl}
        onSelectCommunity={onSelectCommunity}
      />
    )
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

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !pinLayersAddedRef.current) return

    pinsByIdRef.current = new Map(pinsForMap.map((p) => [p.id, p]))

    const featureSets = buildPinFeatureSets(pinsForMap, filter)
      ; (map.getSource(MATCHING_SOURCE_ID) as maplibregl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: featureSets.matching,
      })
      ; (map.getSource(DIMMED_SOURCE_ID) as maplibregl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: featureSets.dimmed,
      })

    if (openPopupRef.current != null && openPopupPinIdRef.current != null && popupRootRef.current != null) {
      const pin = pinsByIdRef.current.get(openPopupPinIdRef.current)
      if (pin) {
        popupRootRef.current.render(
          <PopupContent pin={pin} csrfToken={csrfToken} communityUrl={communityUrl} />
        )
      }
    }

    if (initialPinId != null && !initialPinIdAppliedRef.current) {
      const pin = pins.find((p) => p.id === initialPinId)
      if (pin) {
        // clear all filters in case the pin is not shown in the initial filters
        setFilter(CLEARED_FILTER)
        initialPinIdAppliedRef.current = true
        map.flyTo({ center: [pin.longitude, pin.latitude], zoom: 14 })
        openPinPopup(map, pin)
      }
    }
  }, [pinsForMap, filter, mapReady, initialPinId, pins, setFilter, csrfToken])

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
        <div className={searchActive ? "max-sm:hidden" : "contents"}>
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

