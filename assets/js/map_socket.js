// Map channel: pin realtime sync for React map and other clients.

import { Socket } from "phoenix"

const userToken =
  document.querySelector('meta[name="user-token"]')?.getAttribute("content") ||
  undefined

const socket = new Socket("/socket", { authToken: userToken })
socket.connect()

function topicForCommunityUrl(communityUrl) {
  return communityUrl ? `map:submap:${communityUrl}` : "map:world"
}

let activeChannel = null

/**
 * Join (or return) the map channel for the given community.
 * Pass undefined for the world map. When omitted, reads #react-root dataset.
 */
export function getMapChannel(communityUrl) {
  let resolved = communityUrl
  if (resolved === undefined) {
    const root = document.getElementById("react-root")
    resolved = root?.dataset?.communityUrl || undefined
  }

  const topic = topicForCommunityUrl(resolved)

  if (activeChannel && activeChannel.topic === topic) {
    return activeChannel
  }

  if (activeChannel) {
    activeChannel.leave()
  }

  activeChannel = socket.channel(topic, {})
  activeChannel
    .join()
    .receive("ok", () => { })
    .receive("error", () => { })

  return activeChannel
}
