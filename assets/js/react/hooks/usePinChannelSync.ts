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
    const onUpsert = (payload: PinBroadcastPayload) => onUpsertPinRef.current(payload.pin)
    const onDeleted = (payload: PinDeletedPayload) => onDeletePinIdRef.current(payload.pin_id)
    worldChannel.on("marker_added", onUpsert)
    worldChannel.on("marker_updated", onUpsert)
    worldChannel.on("marker_deleted", onDeleted)
    return () => {
      worldChannel.off("marker_added", onUpsert)
      worldChannel.off("marker_updated", onUpsert)
      worldChannel.off("marker_deleted", onDeleted)
    }
  }, [])
}

