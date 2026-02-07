import React, { useEffect, useRef, useState } from "react"
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
import { CLEARED_FILTER, DEFAULT_FILTER, filterPins, type FilterState } from "./map/filters"
import PopupContent from "./map/PopupContent"
import MapFilters from "./MapFilters"

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Failed to load pin image"))
    img.src = dataUrl
  })
}

const PIN_LABEL_MAX_LEN = 22

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


function getCurrentLocation(
  onSuccess: (lat: number, lng: number) => void,
  onError?: (error: GeolocationPositionError) => void
) {
  if (!navigator.geolocation) return

  // Only accept a position if it arrives within rejectAfterSeconds; otherwise we call onError so the
  // UI doesn't jump after a long delay. This is separate from the getCurrentPosition `timeout`
  // option: that controls how long the browser will try before giving up. Here we reject a *successful*
  // result if it took too long (e.g. user was on the permission prompt), to keep the experience snappy.
  const run = (rejectAfterSeconds: number) => {
    const startedAt = Date.now()
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (Date.now() - startedAt < rejectAfterSeconds * 1000) {
          onSuccess(position.coords.latitude, position.coords.longitude)
        } else {
          onError?.({ code: 3, message: "Geolocation took longer than " + rejectAfterSeconds + " seconds" } as GeolocationPositionError)
        }
      },
      (err) => onError?.(err),
      { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000 }
    )
  }
  const noPermissionTimeoutSeconds = 3;
  if (navigator.permissions?.query) {
    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => run(result.state === "prompt" ? 10 : noPermissionTimeoutSeconds))
      .catch(() => run(noPermissionTimeoutSeconds))
  } else {
    run(noPermissionTimeoutSeconds)
  }
}

type Props = {
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
}

export default function MapCanvas({ styleUrl, pins, initialPinId = null, onMapClick, onEdit, onDelete, pendingLocation = null, pendingPinType = null, editingPinId = null, onPlacementMapClick, onPopupOpen, onPopupClose }: Props) {
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
  const openPopupRef = useRef<Popup | null>(null)
  const openPopupPinIdRef = useRef<number | null>(null)
  const popupRootRef = useRef<ReturnType<typeof createRoot> | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)
  const filterPanelOpenRef = useRef<{ open(): void } | null>(null)

  // Sync with layout drawer (checkbox #drawer-toggle) so we can hide overlays when drawer is open
  useEffect(() => {
    const toggle = document.getElementById("drawer-toggle") as HTMLInputElement | null
    if (!toggle) return
    const sync = () => setDrawerOpen(toggle.checked)
    sync()
    toggle.addEventListener("change", sync)
    return () => toggle.removeEventListener("change", sync)
  }, [])

  const filteredPins = filterPins(pins, filter)

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current) return
    let isMounted = true

    const init = async () => {
      const style = await fetch(styleUrl).then((r) => r.json())
      if (!isMounted) return
      const control = new MapLibreSearchControl({
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
        // performance optimization
        validateStyle: false,
      })
      // The search control is implemented against a different maplibre-gl type instance;
      // coerce it to the expected IControl to satisfy TypeScript.
      map.addControl(control as unknown as maplibregl.IControl, "top-left");
      mapRef.current = map
      map.on("click", (e) => {
        if (onPlacementMapClickRef.current) {
          onPlacementMapClickRef.current(e.lngLat.lng, e.lngLat.lat)
          return
        }

        const hasVisiblePopup = document.querySelector(".maplibregl-popup") !== null
        if (hasVisiblePopup) return

        // Ignore clicks on pin icons (handled by pin-icons-layer click)
        const hit = map.queryRenderedFeatures(e.point, { layers: ["pin-icons-layer"] })
        if (hit.length > 0) return

        onMapClick(e.lngLat.lng, e.lngLat.lat)
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
          map.addSource("pin-features", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] }
          })
          map.addLayer({
            id: "pin-icons-layer",
            type: "symbol",
            source: "pin-features",
            layout: {
              "icon-image": ["get", "pin_type_icon"],
              "icon-size": 1,
              "icon-anchor": "bottom",
              "icon-allow-overlap": true,
              "icon-ignore-placement": true
            }
          })
          map.addLayer({
            id: "pin-labels-layer",
            type: "symbol",
            source: "pin-features",
            layout: {
              "text-field": ["get", "title"],
              "text-font": ["Open Sans Bold", "Arial Unicode MS Bold", "sans-serif"],
              "text-size": 14,
              "text-anchor": "top",
              "text-offset": [0, 0],
              "text-allow-overlap": false,
              "text-ignore-placement": false
            },
            paint: {
              "text-color": "#1f2937",
              "text-halo-color": ["get", "haloColor"],
              "text-halo-width": 1.7
            }
          })
          pinLayersAddedRef.current = true

          const initialPins = pinsToShowRef.current
          pinsByIdRef.current = new Map(initialPins.map((p) => [p.id, p]))
          const initialFeatures = initialPins.map((pin) => {
            const pinColor = getPinTypeConfig(pin.pin_type).color
            return {
              type: "Feature" as const,
              geometry: { type: "Point" as const, coordinates: [pin.longitude, pin.latitude] },
              properties: {
                pin_id: pin.id,
                title: truncateTitle(pin.title),
                pin_type: pin.pin_type,
                pin_type_icon: getPinTypeMarkerImageId(pin.pin_type),
                haloColor: desaturateHex(pinColor)
              }
            }
          })
            ; (map.getSource("pin-features") as maplibregl.GeoJSONSource).setData({
              type: "FeatureCollection",
              features: initialFeatures
            })

          map.on("click", "pin-icons-layer", (e) => {
            const feature = e.features?.[0]
            if (!feature) return
            const pinId = feature.properties?.pin_id as number | undefined
            if (pinId == null) return
            const pin = pinsByIdRef.current.get(pinId)
            if (!pin) return
            openPinPopup(map, pin)
          })
          map.on("mouseenter", "pin-icons-layer", () => {
            map.getCanvas().style.cursor = "pointer"
          })
          map.on("mouseleave", "pin-icons-layer", () => {
            map.getCanvas().style.cursor = ""
          })

          setMapReady(true)
        } catch (err) {
          console.error("Failed to set up pin layers", err)
          setMapReady(true)
        }
      })
    }
    init()

    return () => {
      isMounted = false
      pinLayersAddedRef.current = false
      pendingMarkerRef.current?.remove()
      pendingMarkerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [styleUrl, onMapClick])

  // Get user's location and center map (skip when opening a shared pin link)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || initialPinId != null) return

    getCurrentLocation(
      (lat, lng) => map.jumpTo({ center: [lng, lat], zoom: 10 }),
      (error) => console.log('Geolocation not available or denied:', error.message)
    )
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
          const path = window.location.pathname || '/map'
          const url = `${window.location.origin}${path}?pin=${pinId}`
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

  const pinsToShow = editingPinId != null
    ? filteredPins.filter((p) => p.id !== editingPinId)
    : filteredPins
  const pinsToShowRef = useRef<Pin[]>(pinsToShow)
  pinsToShowRef.current = pinsToShow

  function buildPinFeatures(pinList: Pin[]) {
    return pinList.map((pin) => {
      const pinColor = getPinTypeConfig(pin.pin_type).color
      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [pin.longitude, pin.latitude] },
        properties: {
          pin_id: pin.id,
          title: truncateTitle(pin.title),
          pin_type: pin.pin_type,
          pin_type_icon: getPinTypeMarkerImageId(pin.pin_type),
          haloColor: desaturateHex(pinColor)
        }
      }
    })
  }

  function openPinPopup(map: MLMap, pin: Pin): void {
    onPopupOpenRef.current?.(pin.id)
    const container = document.createElement("div")
    const root = createRoot(container)
    root.render(<PopupContent pin={pin} />)
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

    pinsByIdRef.current = new Map(pinsToShow.map((p) => [p.id, p]))

    const features = buildPinFeatures(pinsToShow)
      ; (map.getSource("pin-features") as maplibregl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features
      })

    if (openPopupRef.current != null && openPopupPinIdRef.current != null && popupRootRef.current != null) {
      const pin = pinsByIdRef.current.get(openPopupPinIdRef.current)
      if (pin) {
        popupRootRef.current.render(<PopupContent pin={pin} />)
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
  }, [pinsToShow, mapReady, initialPinId, editingPinId])

  const goToMyLocation = () => {
    const map = mapRef.current
    if (!map) return
    getCurrentLocation((lat, lng) => map.flyTo({ center: [lng, lat], zoom: 10 }))
  }

  const activeFilterParts =
    (filter.time === "now" ? ["Open now"] : []).concat(filter.tag !== null ? [filter.tag] : [])
  const activeFilterSummary = activeFilterParts.join(" · ")
  const filtersAriaLabel =
    activeFilterParts.length > 0 ? `Show filters. Active: ${activeFilterParts.join("; ")}` : "Show filters"

  return (
    <div className="relative w-full h-full">
      {mapReady && !drawerOpen && (
        <>
          <div className="absolute top-14 left-2 z-10 flex flex-col gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline whitespace-nowrap bg-base-100/30"
              aria-label="Go to my location"
              onClick={goToMyLocation}
            >
              Go to my location
            </button>
            <button
              type="button"
              className="flex flex-col items-start gap-0.5 min-w-0 bg-base-100 border border-base-300 rounded-full shadow-lg px-4 py-3 text-sm font-medium text-base-content hover:opacity-90 active:opacity-80 transition-opacity text-left"
              aria-label={filtersAriaLabel}
              onClick={() => filterPanelOpenRef.current?.open()}
            >
              <span className="whitespace-nowrap">Filters</span>
              {activeFilterParts.length > 0 && (
                <span className="text-xs text-base-content/80 truncate max-w-[12rem]">
                  {activeFilterSummary}
                </span>
              )}
            </button>
          </div>
          <MapFilters
            pins={pins}
            filter={filter}
            setFilter={setFilter}
            openRef={filterPanelOpenRef}
            hideTrigger
            panelTopOffset="6.5rem"
          />
        </>
      )}
      {onPlacementMapClick && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30">
          <div className="bg-primary text-primary-content rounded shadow px-4 py-2 text-sm font-medium">
            Click or tap on the map to set location
          </div>
        </div>
      )}
      <div ref={containerRef} id="map" className="w-full h-full" />
    </div>
  )
}


