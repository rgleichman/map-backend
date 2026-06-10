import { useEffect, useRef } from "react"
import { getMapChannel } from "../../map_socket"
import type { Pin } from "../types"

type PinBroadcastPayload = { pin: Pin }
type PinDeletedPayload = { pin_id: number }

type Params = {
  onUpsertPin: (pin: Pin) => void
  onDeletePinId: (pinId: number) => void
  communityUrl?: string
}

export function usePinChannelSync({ onUpsertPin, onDeletePinId, communityUrl }: Params): void {
  const onUpsertPinRef = useRef(onUpsertPin)
  const onDeletePinIdRef = useRef(onDeletePinId)
  onUpsertPinRef.current = onUpsertPin
  onDeletePinIdRef.current = onDeletePinId

  useEffect(() => {
    const channel = getMapChannel(communityUrl)
    const onUpsert = (payload: PinBroadcastPayload) => onUpsertPinRef.current(payload.pin)
    const onDeleted = (payload: PinDeletedPayload) => onDeletePinIdRef.current(payload.pin_id)
    channel.on("marker_added", onUpsert)
    channel.on("marker_updated", onUpsert)
    channel.on("marker_deleted", onDeleted)
    return () => {
      channel.off("marker_added", onUpsert)
      channel.off("marker_updated", onUpsert)
      channel.off("marker_deleted", onDeleted)
    }
  }, [communityUrl])
}
