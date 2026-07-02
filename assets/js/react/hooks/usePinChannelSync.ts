import { useEffect, useRef } from "react"
import { getMapChannel, getModMapChannel, leaveModMapChannel } from "../../map_socket"
import type { Pin } from "../types"

type PinBroadcastPayload = { pin: Pin }
type PinDeletedPayload = { pin_id: number }
type MapChannel = ReturnType<typeof getMapChannel>

type Params = {
  onUpsertPin: (pin: Pin) => void
  onDeletePinId: (pinId: number) => void
  communityUrl?: string
  canModerate?: boolean
}

function attachPinListeners(
  channel: MapChannel,
  onUpsert: (payload: PinBroadcastPayload) => void,
  onDeleted: (payload: PinDeletedPayload) => void,
) {
  channel.on("marker_added", onUpsert)
  channel.on("marker_updated", onUpsert)
  channel.on("marker_deleted", onDeleted)
}

function detachPinListeners(
  channel: MapChannel,
  onUpsert: (payload: PinBroadcastPayload) => void,
  onDeleted: (payload: PinDeletedPayload) => void,
) {
  channel.off("marker_added", onUpsert)
  channel.off("marker_updated", onUpsert)
  channel.off("marker_deleted", onDeleted)
}

export function usePinChannelSync({
  onUpsertPin,
  onDeletePinId,
  communityUrl,
  canModerate = false,
}: Params): void {
  const onUpsertPinRef = useRef(onUpsertPin)
  const onDeletePinIdRef = useRef(onDeletePinId)
  onUpsertPinRef.current = onUpsertPin
  onDeletePinIdRef.current = onDeletePinId

  useEffect(() => {
    const channel = getMapChannel(communityUrl)
    const onUpsert = (payload: PinBroadcastPayload) => onUpsertPinRef.current(payload.pin)
    const onDeleted = (payload: PinDeletedPayload) => onDeletePinIdRef.current(payload.pin_id)

    attachPinListeners(channel, onUpsert, onDeleted)

    let modChannel: MapChannel | null = null
    if (canModerate && communityUrl) {
      modChannel = getModMapChannel(communityUrl)
      if (modChannel) {
        attachPinListeners(modChannel, onUpsert, onDeleted)
      }
    } else {
      leaveModMapChannel()
    }

    return () => {
      detachPinListeners(channel, onUpsert, onDeleted)
      if (modChannel) {
        detachPinListeners(modChannel, onUpsert, onDeleted)
      }
    }
  }, [communityUrl, canModerate])
}
