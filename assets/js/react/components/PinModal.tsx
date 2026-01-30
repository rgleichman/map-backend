import React, { useCallback, useEffect, useRef, useState } from "react"
import * as api from "../api/client"

type Props = {
  title: string
  setTitle: (t: string) => void
  description: string
  setDescription: (d: string) => void
  tags: string[]
  setTags: (tags: string[]) => void
  startTime: string
  setStartTime: (t: string) => void
  endTime: string
  setEndTime: (t: string) => void
  latitude: number
  longitude: number
  onStartPickOnMap: () => void
  onLocationFromSearch: (lat: number, lng: number) => void
  onLocationFromGPS: (lat: number, lng: number) => void
  mode: "add" | "edit"
  onCancel: () => void
  onSave: () => void
  onDelete?: () => void
  canDelete?: boolean
}

export default function PinModal({
  title, setTitle,
  description, setDescription,
  tags, setTags,
  startTime, setStartTime,
  endTime, setEndTime,
  latitude, longitude,
  onStartPickOnMap,
  onLocationFromSearch,
  onLocationFromGPS,
  mode, onCancel, onSave, onDelete, canDelete
}: Props) {
  const [tagInput, setTagInput] = useState("")
  const [locationSearch, setLocationSearch] = useState("")
  const [locationResults, setLocationResults] = useState<Array<{ lat: number; lng: number; display_name: string }>>([])
  const [locationSearching, setLocationSearching] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const handleAddTag = () => {
    const newTag = tagInput.trim()
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag])
    }
    setTagInput("")
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  useEffect(() => {
    if (locationSearch.trim().length < 2) {
      setLocationResults([])
      return
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setLocationSearching(true)
      setLocationError(null)
      api.searchLocation(locationSearch)
        .then(({ data }) => setLocationResults(data || []))
        .catch(() => {
          setLocationError("Search failed")
          setLocationResults([])
        })
        .finally(() => setLocationSearching(false))
    }, 300)
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [locationSearch])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target as Node)) {
        setLocationResults([])
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [])

  const handleSelectResult = useCallback((lat: number, lng: number) => {
    onLocationFromSearch(lat, lng)
    setLocationSearch("")
    setLocationResults([])
  }, [onLocationFromSearch])

  const handleUseMyLocation = useCallback(() => {
    setGpsError(null)
    if (!navigator.geolocation) {
      setGpsError("Location unavailable")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords
        onLocationFromGPS(lat, lng)
      },
      () => setGpsError("Location unavailable"),
      { enableHighAccuracy: true }
    )
  }, [onLocationFromGPS])

  const formatCoord = (n: number) => n.toFixed(5)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="pin-modal-content rounded-lg min-w-[300px] max-h-[90vh] overflow-y-auto shadow-xl p-6">
        <h2 className="text-lg font-semibold mb-4">{mode === "edit" ? "Edit Pin" : "Add Pin"}</h2>
        <input
          id="pin-title"
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus={mode === "add"}
          className="w-full mb-4 px-3 py-2 rounded border"
        />
        <textarea
          id="pin-description"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded border"
        />

        <div className="mb-4">
          <label className="block font-medium mb-1">Location</label>
          <p className="text-sm text-base-content/80 mb-2">
            {formatCoord(latitude)}, {formatCoord(longitude)}
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              type="button"
              onClick={onStartPickOnMap}
              className="btn btn-sm btn-outline"
            >
              {mode === "edit" ? "Change location on map" : "Set location on map"}
            </button>
            <button
              type="button"
              onClick={handleUseMyLocation}
              className="btn btn-sm btn-outline"
            >
              Use my location
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder="Search for a place or address"
              className="w-full px-3 py-2 rounded border"
            />
            {locationSearching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-base-content/60">Searching…</span>
            )}
            {locationError && (
              <p className="text-sm text-error mt-1">{locationError}</p>
            )}
            {gpsError && (
              <p className="text-sm text-error mt-1">{gpsError}</p>
            )}
            {locationResults.length > 0 && (
              <div
                ref={resultsRef}
                className="absolute left-0 right-0 top-full mt-1 bg-base-100 border rounded shadow-lg max-h-48 overflow-y-auto z-10"
              >
                {locationResults.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    className="block w-full text-left px-3 py-2 hover:bg-base-200 text-sm"
                    onClick={() => handleSelectResult(r.lat, r.lng)}
                  >
                    {r.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mb-4">
          <label className="block font-medium mb-1">Start Time</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            className="w-full mb-2 px-3 py-2 rounded border"
          />
          <label className="block font-medium mb-1">End Time</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            className="w-full mb-2 px-3 py-2 rounded border"
          />
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">Tags</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
              className="px-2 py-1 rounded border flex-1"
              placeholder="Add tag"
            />
            <button type="button" onClick={handleAddTag} className="btn btn-sm btn-primary">Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <span key={tag} className="inline-flex items-center bg-base-200 text-base-content rounded px-2 py-1 text-sm">
                {tag}
                <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-2 text-red-500 hover:text-red-700">×</button>
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn">Cancel</button>
          {mode === "edit" && canDelete && (
            <button onClick={onDelete} className="btn btn-error">Delete</button>
          )}
          <button onClick={onSave} className="btn btn-success">{mode === "edit" ? "Save" : "Add"}</button>
        </div>
      </div>
    </div>
  )
}
