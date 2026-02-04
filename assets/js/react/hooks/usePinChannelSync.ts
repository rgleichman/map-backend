import { useEffect, useRef } from "react"
import worldChannel from "../../user_socket"
import type { Pin } from "../types"

type PinBroadcastPayload = { pin: Pin }
type PinDeletedPayload = { pin_id: number }

type Params = {
  onUpsertPin: (pin: Pin) => void
  onDeletePinId: (pinId: number) => void
}

export function usePinChannelSync({ onUpsertPin, onDeletePinId }: Params): void {
  const onUpsertPinRef = useRef(onUpsertPin)
  const onDeletePinIdRef = useRef(onDeletePinId)
  onUpsertPinRef.current = onUpsertPin
  onDeletePinIdRef.current = onDeletePinId

  useEffect(() => {
    const handler = (payload: PinBroadcastPayload) => onUpsertPinRef.current(payload.pin)
    worldChannel.on("marker_added", handler)
    return () => worldChannel.off("marker_added", handler)
  }, [])

  useEffect(() => {
    const handler = (payload: PinBroadcastPayload) => onUpsertPinRef.current(payload.pin)
    worldChannel.on("marker_updated", handler)
    return () => worldChannel.off("marker_updated", handler)
  }, [])

  useEffect(() => {
    const handler = (payload: PinDeletedPayload) => onDeletePinIdRef.current(payload.pin_id)
    worldChannel.on("marker_deleted", handler)
    return () => worldChannel.off("marker_deleted", handler)
  }, [])
}

