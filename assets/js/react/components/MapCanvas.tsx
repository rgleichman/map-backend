import React, { useEffect, useRef, useState } from "react"
import maplibregl, { Map as MLMap, Marker, Popup } from "maplibre-gl"
import type { Pin } from "../types"
import { MapLibreSearchControl } from "@stadiamaps/maplibre-search-box";

type Props = {
  styleUrl: string
  pins: Pin[]
  initialPinId?: number | null
  onMapClick: (lng: number, lat: number) => void
  onEdit: (pinId: number) => void
  onDelete: (pinId: number) => void
  pickingLocation?: boolean
  onMapClickSetLocation?: (lng: number, lat: number) => void
  onPopupOpen?: (pinId: number) => void
  onPopupClose?: () => void
}

export default function MapCanvas({ styleUrl, pins, initialPinId = null, onMapClick, onEdit, onDelete, pickingLocation = false, onMapClickSetLocation, onPopupOpen, onPopupClose }: Props) {
  const mapRef = useRef<MLMap | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const markersRef = useRef<Map<number, Marker>>(new Map())
  const initialPinIdAppliedRef = useRef(false)
  const pickingLocationRef = useRef(pickingLocation)
  const onMapClickSetLocationRef = useRef(onMapClickSetLocation)
  pickingLocationRef.current = pickingLocation
  onMapClickSetLocationRef.current = onMapClickSetLocation
  const [mapReady, setMapReady] = useState(false)
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  // Filter pins by tag if tagFilter is set
  const filteredPins = tagFilter
    ? pins.filter((p) => p.tags && p.tags.includes(tagFilter))
    : pins

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current) return
    let isMounted = true

    const init = async () => {
      const style = await fetch(styleUrl).then((r) => r.json())
      if (!isMounted) return
      const control = new MapLibreSearchControl({
        onResultSelected: feature => {
          // You can add code here to take some action when a result is selected.
          console.log(feature.geometry.coordinates);
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

        if (pickingLocationRef.current && onMapClickSetLocationRef.current) {
          onMapClickSetLocationRef.current(e.lngLat.lng, e.lngLat.lat)
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

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          map.jumpTo({
            center: [longitude, latitude],
            zoom: 10
          })
        },
        (error) => {
          console.log('Geolocation not available or denied:', error.message)
        },
        { enableHighAccuracy: true }
      )
    }
  }, [mapReady, initialPinId])

  // Set up event delegation for popup buttons
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const filteredPins = tagFilter
      ? pins.filter((p) => p.tags && p.tags.includes(tagFilter))
      : pins

    const handlePopupClick = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.matches('[data-pin-action]')) {
        e.stopPropagation()
        const action = target.dataset.pinAction
        const pinId = parseInt(target.dataset.pinId || '0', 10)
        if (action === 'edit') {
          onEdit(pinId)
        } else if (action === 'delete') {
          onDelete(pinId)
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
          setTagFilter(tag)
          // Close all popups
          document.querySelectorAll('.maplibregl-popup').forEach((el) => {
            (el as HTMLElement).style.display = 'none';
          });
        }
      }
    }

    // Add event listener to map container for delegation
    map.getContainer().addEventListener('click', handlePopupClick)

    return () => {
      map.getContainer().removeEventListener('click', handlePopupClick)
    }
  }, [mapReady, onEdit, onDelete])

  // Sync markers with pins
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const known = markersRef.current
    const nextIds = new Set(filteredPins.map((p) => p.id))

    // remove stale
    for (const [id, marker] of known) {
      if (!nextIds.has(id)) {
        marker.remove()
        known.delete(id)
      }
    }

    // add/update
    filteredPins.forEach((pin) => {
      let marker = known.get(pin.id)
      const tagsHtml = pin.tags && pin.tags.length > 0
        ? `<div class="flex flex-wrap" style="margin: 0.5em 0;">
            <span style="font-size:0.95em; color:var(--color-base-content); margin-right:0.5em;">Tags:</span>
            ${pin.tags.map(t =>
          `<button 
                data-tag="${t}" 
                style="background:var(--color-base-200); color:var(--color-base-content); border-radius:4px; padding:0.1em 0.5em; margin-top:0.1em; margin-bottom:0.1em; margin-right:0.3em; font-size:0.95em; border:none; cursor:pointer;"
              >${t}</button>`
        ).join('')}
          </div>`
        : ""
      // Format date/time for display
      const formatDateTime = (iso?: string) => {
        if (!iso) return ""
        try {
          const d = new Date(iso)
          return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
        } catch {
          return iso
        }
      }
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
      const isAndroid = /Android/.test(navigator.userAgent)
      const openInMapsUrl = isIOS
        ? `https://maps.apple.com/place?coordinate=${pin.latitude},${pin.longitude}&name=${encodeURIComponent(pin.title)}`
        : isAndroid
          ? `geo:${pin.latitude},${pin.longitude}?q=${pin.latitude},${pin.longitude}(${encodeURIComponent(pin.title)})`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pin.latitude},${pin.longitude}`)}`
      const popupHtml = `
          <div>
            <h2 style="font-size: 1.4em; font-weight: bold;">${pin.title}</h2>
            <p>${pin.description || ""}</p>
            ${(pin.start_time || pin.end_time) ? `<div style="margin: 0.5em 0;">
              <span style="font-size:0.95em; color:var(--color-base-content);"><b>Start:</b> ${formatDateTime(pin.start_time)}</span><br/>
              <span style="font-size:0.95em; color:var(--color-base-content);"><b>End:</b> ${formatDateTime(pin.end_time)}</span>
            </div>` : ""}
            ${tagsHtml}
            <div style="margin-top: 0.5em;">
              <a href="${openInMapsUrl}" target="_blank" rel="noopener noreferrer" style="margin-right: 0.5em; padding: 0.3em 0.6em; background: #3182ce; color: white; border: none; border-radius: 4px; text-decoration: none; display: inline-block;">Get directions</a>
              <button data-pin-action="copy-link" data-pin-id="${pin.id}" style="padding: 0.3em 0.6em; background: var(--color-base-200); color: var(--color-base-content); border: none; border-radius: 4px; cursor: pointer;">Copy link</button>
            </div>
            ${pin.is_owner ? `<div style=\"margin-top: 0.5em;\">
              <button data-pin-action=\"edit\" data-pin-id=\"${pin.id}\" style=\"margin-right: 0.5em; padding: 0.3em 0.6em; background: #38a169; color: white; border: none; border-radius: 4px;\">Edit</button>
              <button data-pin-action=\"delete\" data-pin-id=\"${pin.id}\" style=\"padding: 0.3em 0.6em; background: #e53e3e; color: white; border: none; border-radius: 4px;\">Delete</button>
            </div>` : ""}
          </div>`
      if (!marker) {
        const popup = new Popup().setHTML(popupHtml)
        popup.on("open", () => onPopupOpen?.(pin.id))
        popup.on("close", () => onPopupClose?.())
        marker = new Marker().setLngLat([pin.longitude, pin.latitude]).setPopup(popup).addTo(map)
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
      const pin = filteredPins.find((p) => p.id === initialPinId)
      if (marker && pin) {
        initialPinIdAppliedRef.current = true
        map.flyTo({ center: [pin.longitude, pin.latitude], zoom: 14 })
        marker.togglePopup()
      }
    }
  }, [filteredPins, mapReady, initialPinId])

  return (
    <div className="relative w-full h-full">
      {pickingLocation && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-primary text-primary-content rounded shadow px-4 py-2 text-sm font-medium">
          Tap on the map to set location
        </div>
      )}
      {tagFilter && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-base-100/90 rounded shadow px-4 py-2 flex items-center gap-2">
          <span className="font-medium text-base-content">Filtered by tag:</span>
          <span className="px-2 py-1 bg-base-200 text-base-content rounded text-sm">{tagFilter}</span>
          <button
            className="ml-2 px-2 py-1 text-xs rounded bg-base-200 hover:bg-base-300 transition text-base-content"
            onClick={() => setTagFilter(null)}
          >
            Clear Filter
          </button>
        </div>
      )}
      <div ref={containerRef} id="map" className="w-full h-full" />
    </div>
  )
}


