import React, { useCallback, useEffect, useMemo, useState } from "react"
import worldChannel from "../user_socket"
import MapCanvas from "./components/MapCanvas"
import PinModal from "./components/PinModal"
import LoginRequiredModal from "./components/LoginRequiredModal"
import type { NewPin, Pin, UpdatePin } from "./types"
import * as api from "./api/client"
import "@stadiamaps/maplibre-search-box/dist/maplibre-search-box.css";

type Props = {
  userId?: number
  csrfToken?: string
  styleUrl?: string
}

export default function App({ userId, csrfToken, styleUrl = "/api/map/style" }: Props) {
  const [pins, setPins] = useState<Pin[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | { mode: "add"; lng: number; lat: number } | { mode: "edit"; pin: Pin } | { mode: "login-required" }>(null)
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
    // Set default startTime to now, endTime to now + 1 hour (in local time, formatted for input)
    const now = new Date()
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000)
    setStartTime(dateToLocalInputValue(now))
    setEndTime(dateToLocalInputValue(inOneHour))
    setModal({ mode: "add", lng, lat })
  }, [userId])

  const onEdit = useCallback((pinId: number) => {
    const pin = pins.find(p => p.id === pinId)
    if (!pin) return
    setTitle(pin.title)
    setDescription(pin.description || "")
    setTags(pin.tags || [])
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
  }, [csrfToken, pins])

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
      const payload: NewPin = {
        title,
        description,
        latitude: modal.lat,
        longitude: modal.lng,
        tags,
        start_time: toISOString(startTime),
        end_time: toISOString(endTime)
      }
      const { data: pinData } = await api.createPin(csrfToken, payload)
      setPins((prev) => [...prev, pinData])
      setModal(null)
    } else if (modal.mode === "edit") {
      const changes: UpdatePin = {
        title,
        description,
        tags,
        start_time: toISOString(startTime),
        end_time: toISOString(endTime)
      }
      const { data } = await api.updatePin(csrfToken, modal.pin.id, changes)
      setPins((prev) => prev.map((p) => p.id === data.id ? { ...p, title: data.title, description: data.description, tags: data.tags, start_time: data.start_time, end_time: data.end_time } : p))
      setModal(null)
    }
  }, [modal, title, description, tags, startTime, endTime, csrfToken])

  const canDelete = useMemo(() => modal && modal.mode === "edit" && modal.pin.is_owner, [modal]) as boolean | undefined

  return (
    <div className="w-full h-full">
      {!loading && (
        <MapCanvas
          styleUrl={styleUrl}
          pins={pins}
          onMapClick={onMapClick}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
      {modal && modal.mode === "login-required" && (
        <LoginRequiredModal onClose={() => setModal(null)} />
      )}
      {modal && (modal.mode === "add" || modal.mode === "edit") && (
        <>
          <PinModal
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
            mode={modal.mode}
            onCancel={() => setModal(null)}
            onSave={onSave}
            onDelete={modal.mode === "edit" ? () => onDelete(modal.pin.id) : undefined}
            canDelete={canDelete}
          />
          {timeError && (
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
              <div className="absolute bg-red-600 text-white px-4 py-2 rounded shadow-lg pointer-events-auto" style={{top: '10%'}}>⏰ {timeError}</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}


