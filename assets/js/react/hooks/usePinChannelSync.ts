import { useEffect } from "react"
import worldChannel from "../../user_socket"
import type { Pin } from "../types"

type PinBroadcastPayload = { pin: Pin }
type PinDeletedPayload = { pin_id: number }

type Params = {
  onUpsertPin: (pin: Pin) => void
  onDeletePinId: (pinId: number) => void
}

export function usePinChannelSync({ onUpsertPin, onDeletePinId }: Params): void {
  useEffect(() => {
    const handler = (payload: PinBroadcastPayload) => onUpsertPin(payload.pin)
    worldChannel.on("marker_added", handler)
    return () => worldChannel.off("marker_added", handler)
  }, [onUpsertPin])

  useEffect(() => {
    const handler = (payload: PinBroadcastPayload) => onUpsertPin(payload.pin)
    worldChannel.on("marker_updated", handler)
    return () => worldChannel.off("marker_updated", handler)
  }, [onUpsertPin])

  useEffect(() => {
    const handler = (payload: PinDeletedPayload) => onDeletePinId(payload.pin_id)
    worldChannel.on("marker_deleted", handler)
    return () => worldChannel.off("marker_deleted", handler)
  }, [onDeletePinId])
}

