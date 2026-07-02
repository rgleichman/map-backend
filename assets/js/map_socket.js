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

function modTopicForCommunityUrl(communityUrl) {
  return communityUrl ? `${topicForCommunityUrl(communityUrl)}:mod` : null
}

let activePublicChannel = null
let activeModChannel = null

function joinChannel(topic) {
  const channel = socket.channel(topic, {})
  channel
    .join()
    .receive("ok", () => { })
    .receive("error", () => { })
  return channel
}

function leaveChannel(channel) {
  if (channel) {
    channel.leave()
  }
}

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

  if (activePublicChannel && activePublicChannel.topic === topic) {
    return activePublicChannel
  }

  leaveChannel(activePublicChannel)
  activePublicChannel = joinChannel(topic)
  return activePublicChannel
}

/**
 * Join the moderator-only sub-map channel (pending + approved pins).
 * Returns null on the world map or when communityUrl is missing.
 */
export function getModMapChannel(communityUrl) {
  if (!communityUrl) return null

  const topic = modTopicForCommunityUrl(communityUrl)

  if (activeModChannel && activeModChannel.topic === topic) {
    return activeModChannel
  }

  leaveChannel(activeModChannel)
  activeModChannel = joinChannel(topic)
  return activeModChannel
}

export function leaveModMapChannel() {
  leaveChannel(activeModChannel)
  activeModChannel = null
}
