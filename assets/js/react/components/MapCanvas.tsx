import React, { useEffect, useRef, useState } from "react"
import maplibregl, { Map as MLMap, Marker, Popup } from "maplibre-gl"
import type { Pin, PinType } from "../types"
import { createPinTypeMarkerElement } from "../utils/pinTypeIcons"
import { MapLibreSearchControl } from "@stadiamaps/maplibre-search-box";
import { DEFAULT_FILTER, filterPins, type FilterState } from "./map/filters"
import { buildPopupHtml } from "./map/popup"
import MapFilters from "./MapFilters"

function getCurrentLocation(
  onSuccess: (lat: number, lng: number) => void,
  onError?: (error: GeolocationPositionError) => void
) {
  if (!navigator.geolocation) return
  navigator.geolocation.getCurrentPosition(
    (position) => onSuccess(position.coords.latitude, position.coords.longitude),
    (err) => onError?.(err),  
    { enableHighAccuracy: false, timeout: 2000, maximumAge: 60000 }
  )
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
  const markersRef = useRef<Map<number, Marker>>(new Map())
  const pendingMarkerRef = useRef<Marker | null>(null)
  const initialPinIdAppliedRef = useRef(false)
  const onPlacementMapClickRef = useRef(onPlacementMapClick)
  onPlacementMapClickRef.current = onPlacementMapClick
  const onEditRef = useRef(onEdit)
  onEditRef.current = onEdit
  const onDeleteRef = useRef(onDelete)
  onDeleteRef.current = onDelete
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
        zoom: 2
      })
      // The search control is implemented against a different maplibre-gl type instance;
      // coerce it to the expected IControl to satisfy TypeScript.
      map.addControl(control as unknown as maplibregl.IControl, "top-left");
      mapRef.current = map
      map.on("click", (e) => {
        const el = e.originalEvent?.target as HTMLElement | undefined

        if (onPlacementMapClickRef.current) {
          onPlacementMapClickRef.current(e.lngLat.lng, e.lngLat.lat)
          return
        }

        // Check if any popup is currently visible in the DOM
        const hasVisiblePopup = document.querySelector('.maplibregl-popup') !== null

        // Check if there's an open popup - if so, just let it close without creating a pin
        if (hasVisiblePopup) {
          return
        }

        // ignore clicks on markers
        let cur: HTMLElement | null | undefined = el
        while (cur) {
          if (cur.classList?.contains("maplibregl-marker")) return
          cur = cur.parentElement
        }
        onMapClick(e.lngLat.lng, e.lngLat.lat)
      })
      setMapReady(true)
    }
    init()

    return () => {
      isMounted = false
      pendingMarkerRef.current?.remove()
      pendingMarkerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
      markersRef.current.forEach((m) => m.remove())
      markersRef.current.clear()
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

  // Sync markers with pins (exclude pin being edited; it is shown at pendingLocation)
  const pinsToShow = editingPinId != null
    ? filteredPins.filter((p) => p.id !== editingPinId)
    : filteredPins

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const known = markersRef.current
    const nextIds = new Set(pinsToShow.map((p) => p.id))

    // remove stale
    for (const [id, marker] of known) {
      if (!nextIds.has(id)) {
        marker.remove()
        known.delete(id)
      }
    }

    // add/update
    pinsToShow.forEach((pin) => {
      let marker = known.get(pin.id)
      const popupHtml = buildPopupHtml(pin, navigator.userAgent)
      if (!marker) {
        const popup = new Popup().setHTML(popupHtml)
        popup.on("open", () => onPopupOpen?.(pin.id))
        popup.on("close", () => onPopupClose?.())
        const markerElement = createPinTypeMarkerElement(pin.pin_type)
        marker = new Marker({ element: markerElement, anchor: "bottom" }).setLngLat([pin.longitude, pin.latitude]).setPopup(popup).addTo(map)
        known.set(pin.id, marker)
      } else {
        marker.setLngLat([pin.longitude, pin.latitude])
        const popup = marker.getPopup()
        popup?.setHTML(popupHtml)
      }
    })

    // Open shared-link pin once when marker exists
    if (initialPinId != null && !initialPinIdAppliedRef.current) {
      const marker = known.get(initialPinId)
      const pin = pinsToShow.find((p) => p.id === initialPinId)
      if (marker && pin) {
        initialPinIdAppliedRef.current = true
        map.flyTo({ center: [pin.longitude, pin.latitude], zoom: 14 })
        marker.togglePopup()
      }
    }
  }, [pinsToShow, mapReady, initialPinId, editingPinId])

  const goToMyLocation = () => {
    const map = mapRef.current
    if (!map) return
    getCurrentLocation((lat, lng) => map.flyTo({ center: [lng, lat], zoom: 10 }))
  }

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
              className="flex items-center gap-2 bg-base-100 border border-base-300 rounded-full shadow-lg px-4 py-3 text-sm font-medium text-base-content hover:opacity-90 active:opacity-80 transition-opacity whitespace-nowrap"
              aria-label="Show filters"
              onClick={() => filterPanelOpenRef.current?.open()}
            >
              Filters
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


