import React, { useEffect, useRef, useState } from "react"
import maplibregl, { Map as MLMap, Marker, Popup } from "maplibre-gl"
import type { Pin } from "../types"
import { MapLibreSearchControl } from "@stadiamaps/maplibre-search-box";

type Props = {
  styleUrl: string
  pins: Pin[]
  onMapClick: (lng: number, lat: number) => void
  onEdit: (pinId: number) => void
  onDelete: (pinId: number) => void
}

export default function MapCanvas({ styleUrl, pins, onMapClick, onEdit, onDelete }: Props) {
  const mapRef = useRef<MLMap | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const markersRef = useRef<Map<number, Marker>>(new Map())
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
        const popupHtml = `
          <div>
            <h2 style="font-size: 1.4em; font-weight: bold;">${pin.title}</h2>
            <p>${pin.description || ""}</p>
            <div style="margin: 0.5em 0;">
              <span style="font-size:0.95em; color:var(--color-base-content);"><b>Start:</b> ${formatDateTime(pin.start_time)}</span><br/>
              <span style="font-size:0.95em; color:var(--color-base-content);"><b>End:</b> ${formatDateTime(pin.end_time)}</span>
            </div>
            ${tagsHtml}
            ${pin.is_owner ? `<div style=\"margin-top: 0.5em;\">
              <button data-pin-action=\"edit\" data-pin-id=\"${pin.id}\" style=\"margin-right: 0.5em; padding: 0.3em 0.6em; background: #38a169; color: white; border: none; border-radius: 4px;\">Edit</button>
              <button data-pin-action=\"delete\" data-pin-id=\"${pin.id}\" style=\"padding: 0.3em 0.6em; background: #e53e3e; color: white; border: none; border-radius: 4px;\">Delete</button>
            </div>` : ""}
          </div>`
      if (!marker) {
        const popup = new Popup().setHTML(popupHtml)
        marker = new Marker().setLngLat([pin.longitude, pin.latitude]).setPopup(popup).addTo(map)
        known.set(pin.id, marker)
      } else {
        // update popup if title changed
        const popup = marker.getPopup()
        popup?.setHTML(popupHtml)
      }
    })
  }, [filteredPins, mapReady])

  return (
    <div className="relative w-full h-full">
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


