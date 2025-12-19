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
  const [modal, setModal] = useState<null | { mode: "add"; lng: number; lat: number } | { mode: "edit"; pin: Pin }>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])

  useEffect(() => {
    api.getPins().then(({ data }) => {
      const enriched = data.map((p) => ({ ...p, is_owner: userId != null && p.user_id === userId }))
      setPins(enriched)
    }).finally(() => setLoading(false))
  }, [userId])

  // Listen for real-time pin additions via Phoenix channel
  useEffect(() => {
    const handler = (payload: any) => {
      const pin = payload.pin
      // Enrich with is_owner flag
      const enriched = { ...pin, is_owner: userId != null && pin.user_id === userId }
      setPins(prevPins => {
        // Avoid duplicates if pin already exists
        if (prevPins.some(p => p.id === enriched.id)) return prevPins
        return [...prevPins, enriched]
      })
    }
    worldChannel.on("marker_added", handler)
    return () => worldChannel.off("marker_added", handler)
  }, [userId])

  const onMapClick = useCallback((lng: number, lat: number) => {
    setTitle("")
    setDescription("")
    setTags([])
    setModal({ mode: "add", lng, lat })
  }, [])

  const onEdit = useCallback((pinId: number) => {
    const pin = pins.find(p => p.id === pinId)
    if (!pin) return
    setTitle(pin.title)
    setDescription(pin.description || "")
    setTags(pin.tags || [])
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

  const onSave = useCallback(async () => {
    if (!modal) return
    if (modal.mode === "add") {
      const payload: NewPin = { title, description, latitude: modal.lat, longitude: modal.lng, tags }
      const { data } = await api.createPin(csrfToken, payload)
      const enriched = { ...data, is_owner: userId != null && data.user_id === userId }
      setPins((prev) => [...prev, enriched])
      setModal(null)
    } else {
      const changes: UpdatePin = { title, description, tags }
      const { data } = await api.updatePin(csrfToken, modal.pin.id, changes)
      setPins((prev) => prev.map((p) => p.id === data.id ? { ...p, title: data.title, description: data.description, tags: data.tags } : p))
      setModal(null)
    }
  }, [modal, title, description, tags, csrfToken, userId])

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
      {modal && (
        <PinModal
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          tags={tags}
          setTags={setTags}
          mode={modal.mode}
          onCancel={() => setModal(null)}
          onSave={onSave}
          onDelete={modal.mode === "edit" ? () => onDelete(modal.pin.id) : undefined}
          canDelete={canDelete}
        />
      )}
    </div>
  )
}


