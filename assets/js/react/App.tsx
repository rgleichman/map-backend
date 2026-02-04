import React, { useCallback, useEffect, useMemo, useState } from "react"
import worldChannel from "../user_socket"
import MapCanvas from "./components/MapCanvas"
import PinModal from "./components/PinModal"
import PinTypeModal from "./components/PinTypeModal"
import PinTypeLegend from "./components/PinTypeLegend"
import LoginRequiredModal from "./components/LoginRequiredModal"
import { useIsDesktop } from "./utils/useMediaQuery"
import type { NewPin, Pin, PinType, UpdatePin } from "./types"
import * as api from "./api/client"
import "@stadiamaps/maplibre-search-box/dist/maplibre-search-box.css"

type Placement =
  | { intent: "add"; lat: number; lng: number }
  | { intent: "edit"; pin: Pin; lat: number; lng: number };

type Props = {
  userId?: number
  csrfToken?: string
  styleUrl?: string
}

const parseInitialPinId = () => {
  const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("pin")
  const n = p ? parseInt(p, 10) : NaN
  return Number.isInteger(n) ? n : null
}

export default function App({ userId, csrfToken, styleUrl = "/api/map/style" }: Props) {
  const isDesktop = useIsDesktop()
  const [initialPinId] = useState(parseInitialPinId)
  const [pins, setPins] = useState<Pin[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | { mode: "select-type"; lng: number; lat: number } | { mode: "add"; lng: number; lat: number; pinType: PinType } | { mode: "edit"; pin: Pin } | { mode: "login-required" }>(null)
  const [placement, setPlacement] = useState<Placement | null>(null)
  const [addLocation, setAddLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [editLocation, setEditLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [pickingLocation, setPickingLocation] = useState(false)
  const [pinType, setPinType] = useState<PinType | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")

  const pad2 = (n: number) => String(n).padStart(2, "0")
  // <input type="datetime-local"> expects a LOCAL "YYYY-MM-DDTHH:mm" string.
  const dateToLocalInputValue = (d: Date) => {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  }
  const isoToLocalInputValue = (s?: string) => (s ? dateToLocalInputValue(new Date(s)) : "")

  useEffect(() => {
    api.getPins().then(({ data }) => {
      setPins(data)
    }).finally(() => setLoading(false))
  }, [])

  // Clear stale ?pin= from URL if pin not in list
  useEffect(() => {
    if (!loading && initialPinId !== null && !pins.some((p) => p.id === initialPinId)) {
      const path = window.location.pathname || "/map"
      window.history.replaceState(null, "", path)
    }
  }, [loading, initialPinId, pins])

  // Helper function to update or add a pin while preserving is_owner
  const updateOrAddPin = useCallback((pin: Pin) => {
    setPins(prevPins => {
      const existingIndex = prevPins.findIndex(p => p.id === pin.id)
      if (existingIndex >= 0) {
        // Preserve is_owner from existing pin to prevent regression where users can't edit pins they created
        const existing = prevPins[existingIndex]
        const updated = [...prevPins]
        updated[existingIndex] = { ...pin, is_owner: existing.is_owner ?? false }
        return updated
      }
      // New pin - broadcast doesn't include is_owner, so set it to false
      return [...prevPins, { ...pin, is_owner: false }]
    })
  }, [])

  // Listen for real-time pin additions via Phoenix channel
  useEffect(() => {
    const handler = (payload: any) => {
      updateOrAddPin(payload.pin)
    }
    worldChannel.on("marker_added", handler)
    return () => worldChannel.off("marker_added", handler)
  }, [updateOrAddPin])

  // Listen for real-time pin updates via Phoenix channel
  useEffect(() => {
    const handler = (payload: any) => {
      updateOrAddPin(payload.pin)
    }
    worldChannel.on("marker_updated", handler)
    return () => worldChannel.off("marker_updated", handler)
  }, [updateOrAddPin])

  // Listen for real-time pin deletions via Phoenix channel
  useEffect(() => {
    const handler = (payload: any) => {
      const pinId = payload.pin_id
      setPins(prev => prev.filter(p => p.id !== pinId))
    }
    worldChannel.on("marker_deleted", handler)
    return () => worldChannel.off("marker_deleted", handler)
  }, [])

  const onMapClick = useCallback((lng: number, lat: number) => {
    if (!userId) {
      setModal({ mode: "login-required" })
      return
    }
    setTitle("")
    setDescription("")
    setTags([])
    setPinType(null)
    setAddLocation({ lat, lng })
    setEditLocation(null)
    setPickingLocation(false)
    const now = new Date()
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000)
    setStartTime(dateToLocalInputValue(now))
    setEndTime(dateToLocalInputValue(inOneHour))
    if (isDesktop) {
      setPlacement(null)
      setModal({ mode: "select-type", lng, lat })
    } else {
      setPlacement({ intent: "add", lat, lng })
      setModal(null)
    }
  }, [userId, isDesktop])

  const onEdit = useCallback((pinId: number) => {
    const pin = pins.find(p => p.id === pinId)
    if (!pin) return
    setTitle(pin.title)
    setDescription(pin.description || "")
    setTags(pin.tags || [])
    setEditLocation(null)
    setPickingLocation(false)
    // Convert ISO string to LOCAL input value (YYYY-MM-DDTHH:mm)
    setStartTime(isoToLocalInputValue(pin.start_time))
    setEndTime(isoToLocalInputValue(pin.end_time))
    setModal({ mode: "edit", pin })
  }, [pins])

  const onDelete = useCallback(async (pinId: number) => {
    const pin = pins.find(p => p.id === pinId)
    if (!pin) return
    if (!confirm("Are you sure you want to delete this pin?")) return
    await api.deletePin(csrfToken, pin.id)
    setPins((prev) => prev.filter((p) => p.id !== pin.id))
    setModal(null)
    setEditLocation(null)
    setPickingLocation(false)
  }, [csrfToken, pins])

  const onStartPickOnMap = useCallback(() => {
    if (isDesktop) {
      setPickingLocation(true)
    } else if (modal?.mode === "edit") {
      setPlacement({
        intent: "edit",
        pin: modal.pin,
        lat: editLocation?.lat ?? modal.pin.latitude,
        lng: editLocation?.lng ?? modal.pin.longitude
      })
    } else if (modal?.mode === "add") {
      const lat = addLocation?.lat ?? modal.lat
      const lng = addLocation?.lng ?? modal.lng
      setPlacement({ intent: "add", lat, lng })
    }
  }, [isDesktop, modal, editLocation, addLocation])

  const onPlacementMove = useCallback((lng: number, lat: number) => {
    setPlacement((prev) => (prev ? { ...prev, lat, lng } : null))
  }, [])

  const onSelectPinType = useCallback((selectedType: PinType) => {
    if (modal?.mode !== "select-type") return
    setPinType(selectedType)
    setModal({ mode: "add", lng: modal.lng, lat: modal.lat, pinType: selectedType })
  }, [modal])

  const onMapClickSetLocation = useCallback((lng: number, lat: number) => {
    setPickingLocation(false)
    if (modal?.mode === "add") {
      setAddLocation({ lat, lng })
    } else if (modal?.mode === "edit") {
      setEditLocation({ lat, lng })
    }
  }, [modal])

  const onLocationFromSearch = useCallback((lat: number, lng: number) => {
    if (modal?.mode === "add") {
      setAddLocation({ lat, lng })
    } else if (modal?.mode === "edit") {
      setEditLocation({ lat, lng })
    }
  }, [modal])

  const onLocationFromGPS = useCallback((lat: number, lng: number) => {
    if (modal?.mode === "add") {
      setAddLocation({ lat, lng })
    } else if (modal?.mode === "edit") {
      setEditLocation({ lat, lng })
    }
  }, [modal])

  const [timeError, setTimeError] = useState<string>("")

  const onSave = useCallback(async () => {
    if (!modal) return
    setTimeError("")
    // Convert input value (local) to ISO string
    const toISOString = (s: string) => s ? new Date(s).toISOString() : undefined
    const start = startTime ? new Date(startTime) : undefined
    const end = endTime ? new Date(endTime) : undefined
    const now = new Date()
    // Validation
    if (start && end) {
      if (end <= start) {
        setTimeError("End time must be after start time.")
        return
      }
      if (end < now) {
        setTimeError("End time cannot be in the past.")
        return
      }
    }
    if (modal.mode === "add") {
      const loc = addLocation ?? { lat: modal.lat, lng: modal.lng }
      if (!pinType) {
        setTimeError("Please select a pin type")
        return
      }
      const payload: NewPin = {
        title,
        pin_type: pinType,
        description,
        latitude: loc.lat,
        longitude: loc.lng,
        tags,
        start_time: toISOString(startTime),
        end_time: toISOString(endTime)
      }
      const { data: pinData } = await api.createPin(csrfToken, payload)
      setPins((prev) => [...prev, pinData])
      setModal(null)
      setAddLocation(null)
      setPinType(null)
    } else if (modal.mode === "edit") {
      const lat = editLocation?.lat ?? modal.pin.latitude
      const lng = editLocation?.lng ?? modal.pin.longitude
      const changes: UpdatePin = {
        title,
        description,
        tags,
        start_time: toISOString(startTime),
        end_time: toISOString(endTime),
        latitude: lat,
        longitude: lng
      }
      const { data } = await api.updatePin(csrfToken, modal.pin.id, changes)
      setPins((prev) => prev.map((p) => p.id === data.id ? { ...p, ...data } : p))
      setModal(null)
      setEditLocation(null)
    }
  }, [modal, addLocation, editLocation, title, description, tags, startTime, endTime, csrfToken])

  const canDelete = useMemo(() => modal && modal.mode === "edit" && modal.pin.is_owner, [modal]) as boolean | undefined

  const pendingLocation = useMemo(() => {
    if (placement) return { lat: placement.lat, lng: placement.lng }
    if (modal?.mode === "add") return addLocation ?? { lat: modal.lat, lng: modal.lng }
    if (modal?.mode === "edit") return editLocation ?? { lat: modal.pin.latitude, lng: modal.pin.longitude }
    return null
  }, [placement, modal, addLocation, editLocation])

  const pendingPinType: PinType | null =
    pendingLocation == null
      ? null
      : placement?.intent === "edit"
        ? placement.pin.pin_type
        : modal?.mode === "add"
          ? (pinType ?? "one_time")
          : modal?.mode === "edit"
            ? modal.pin.pin_type
            : "one_time"

  const editingPinId = modal?.mode === "edit" ? modal.pin.id : null

  const showPlacementOverlay = placement !== null
  const showEditForm = modal?.mode === "edit" && !(placement?.intent === "edit")
  const showAddForm = modal?.mode === "add" && !(placement?.intent === "add")

  const onPopupOpen = useCallback((pinId: number) => {
    const path = window.location.pathname || "/map"
    window.history.replaceState(null, "", `${path}?pin=${pinId}`)
  }, [])
  const onPopupClose = useCallback(() => {
    requestAnimationFrame(() => {
      if (document.querySelector(".maplibregl-popup") === null) {
        const path = window.location.pathname || "/map"
        window.history.replaceState(null, "", path)
      }
    })
  }, [])

  const pinModalLat = modal?.mode === "add" ? (addLocation?.lat ?? modal.lat) : modal?.mode === "edit" ? (editLocation?.lat ?? modal.pin.latitude) : 0
  const pinModalLng = modal?.mode === "add" ? (addLocation?.lng ?? modal.lng) : modal?.mode === "edit" ? (editLocation?.lng ?? modal.pin.longitude) : 0
  const locationAlreadySetFromPlacement = !isDesktop && modal?.mode === "add" && addLocation !== null

  return (
    <div className="w-full h-full">
      {!loading && (
        <>
          <MapCanvas
            styleUrl={styleUrl}
            pins={pins}
            initialPinId={initialPinId}
            onMapClick={onMapClick}
            onEdit={onEdit}
            onDelete={onDelete}
            pickingLocation={pickingLocation}
            onMapClickSetLocation={onMapClickSetLocation}
            pendingLocation={pendingLocation}
            pendingPinType={pendingPinType}
            editingPinId={editingPinId}
            onMapClickMovePlacement={placement ? onPlacementMove : undefined}
            onPopupOpen={onPopupOpen}
            onPopupClose={onPopupClose}
          />
          <PinTypeLegend />
        </>
      )}
      {modal?.mode === "login-required" && (
        <LoginRequiredModal onClose={() => setModal(null)} />
      )}

      {/* Desktop: side panel for type selection and add/edit form */}
      {isDesktop && modal && (modal.mode === "select-type" || modal.mode === "add" || modal.mode === "edit") && !pickingLocation && (
        <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-base-100 border-l border-base-300 shadow-xl z-40 flex flex-col overflow-hidden">
          <div className="p-4 overflow-y-auto flex-1">
            {modal.mode === "select-type" && (
              <PinTypeModal
                layout="panel"
                onSelectType={onSelectPinType}
                onCancel={() => { setModal(null); setAddLocation(null); setPinType(null) }}
              />
            )}
            {(modal.mode === "add" || modal.mode === "edit") && (
              <PinModal
                layout="panel"
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                tags={tags}
                setTags={setTags}
                startTime={startTime}
                setStartTime={setStartTime}
                endTime={endTime}
                setEndTime={setEndTime}
                latitude={pinModalLat}
                longitude={pinModalLng}
                onStartPickOnMap={onStartPickOnMap}
                onLocationFromSearch={onLocationFromSearch}
                onLocationFromGPS={onLocationFromGPS}
                mode={modal.mode}
                onCancel={() => { setModal(null); setPickingLocation(false); setEditLocation(null) }}
                onSave={onSave}
                onDelete={modal.mode === "edit" ? () => onDelete(modal.pin.id) : undefined}
                canDelete={canDelete}
              />
            )}
          </div>
        </div>
      )}

      {/* Mobile: placement overlay (Create/Cancel or Confirm/Cancel) */}
      {!isDesktop && showPlacementOverlay && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-base-100/95 border-t border-base-300 shadow-lg flex gap-2 justify-center">
          {placement.intent === "add" ? (
            modal?.mode === "add" ? (
              <>
                <button type="button" className="btn btn-ghost" onClick={() => setPlacement(null)}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (!placement || placement.intent !== "add") return
                    setAddLocation({ lat: placement.lat, lng: placement.lng })
                    setPlacement(null)
                  }}
                >
                  Confirm
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-ghost" onClick={() => setPlacement(null)}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (!placement || placement.intent !== "add") return
                    const now = new Date()
                    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000)
                    setAddLocation({ lat: placement.lat, lng: placement.lng })
                    setStartTime(dateToLocalInputValue(now))
                    setEndTime(dateToLocalInputValue(inOneHour))
                    setModal({ mode: "select-type", lat: placement.lat, lng: placement.lng })
                    setPlacement(null)
                  }}
                >
                  Create pin
                </button>
              </>
            )
          ) : (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setPlacement(null)}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (!placement || placement.intent !== "edit") return
                  setEditLocation({ lat: placement.lat, lng: placement.lng })
                  setPlacement(null)
                }}
              >
                Confirm
              </button>
            </>
          )}
        </div>
      )}

      {/* Mobile: full modals for type selection and add/edit form */}
      {!isDesktop && modal?.mode === "select-type" && (
        <PinTypeModal
          onSelectType={onSelectPinType}
          onCancel={() => { setModal(null); setAddLocation(null); setPinType(null) }}
        />
      )}
      {!isDesktop && showAddForm && modal?.mode === "add" && (
        <PinModal
          layout="modal"
          locationAlreadySetFromPlacement={locationAlreadySetFromPlacement}
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          tags={tags}
          setTags={setTags}
          startTime={startTime}
          setStartTime={setStartTime}
          endTime={endTime}
          setEndTime={setEndTime}
          latitude={pinModalLat}
          longitude={pinModalLng}
          onStartPickOnMap={onStartPickOnMap}
          onLocationFromSearch={onLocationFromSearch}
          onLocationFromGPS={onLocationFromGPS}
          mode="add"
          onCancel={() => { setModal(null); setEditLocation(null) }}
          onSave={onSave}
          onDelete={undefined}
          canDelete={false}
        />
      )}
      {!isDesktop && showEditForm && modal?.mode === "edit" && (
        <PinModal
          layout="modal"
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          tags={tags}
          setTags={setTags}
          startTime={startTime}
          setStartTime={setStartTime}
          endTime={endTime}
          setEndTime={setEndTime}
          latitude={pinModalLat}
          longitude={pinModalLng}
          onStartPickOnMap={onStartPickOnMap}
          onLocationFromSearch={onLocationFromSearch}
          onLocationFromGPS={onLocationFromGPS}
          mode="edit"
          onCancel={() => { setModal(null); setPlacement(null); setEditLocation(null) }}
          onSave={onSave}
          onDelete={() => onDelete(modal.pin.id)}
          canDelete={canDelete}
        />
      )}

      {timeError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="absolute bg-error text-error-content px-4 py-2 rounded shadow-lg pointer-events-auto" style={{ top: "10%" }}>⏰ {timeError}</div>
        </div>
      )}
    </div>
  )
}


