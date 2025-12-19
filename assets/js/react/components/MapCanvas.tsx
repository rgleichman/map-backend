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
    const nextIds = new Set(pins.map((p) => p.id))

    // remove stale
    for (const [id, marker] of known) {
      if (!nextIds.has(id)) {
        marker.remove()
        known.delete(id)
      }
    }

    // add/update
    pins.forEach((pin) => {
      let marker = known.get(pin.id)
      const tagsHtml = pin.tags && pin.tags.length > 0
        ? `<div style=\"margin: 0.5em 0;\"><span style=\"font-size:0.95em; color:#555;\">Tags:</span> ${pin.tags.map(t => `<span style=\"background:#e2e8f0; color:#2d3748; border-radius:4px; padding:0.1em 0.5em; margin-right:0.3em; font-size:0.95em;\">${t}</span>`).join('')}</div>`
        : ""
      const popupHtml = `
        <div>
          <h2 style="font-size: 1.4em; font-weight: bold;">${pin.title}</h2>
          <p>${pin.description || ""}</p>
          ${tagsHtml}
          ${pin.is_owner ? `<div style="margin-top: 0.5em;">
            <button data-pin-action="edit" data-pin-id="${pin.id}" style="margin-right: 0.5em; padding: 0.3em 0.6em; background: #38a169; color: white; border: none; border-radius: 4px;">Edit</button>
            <button data-pin-action="delete" data-pin-id="${pin.id}" style="padding: 0.3em 0.6em; background: #e53e3e; color: white; border: none; border-radius: 4px;">Delete</button>
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
  }, [pins, mapReady])

  return <div ref={containerRef} id="map" className="w-full h-full" />
}


