// Map channel: pin realtime sync for React map and other clients.

import { Socket } from "phoenix"

const userToken =
  document.querySelector('meta[name="user-token"]')?.getAttribute("content") ||
  undefined

const socket = new Socket("/socket", { authToken: userToken })
socket.connect()

function mapTopicFromRoot() {
  const root = document.getElementById("react-root")
  const communityUrl = root?.dataset?.communityUrl
  return communityUrl ? `map:submap:${communityUrl}` : "map:world"
}

let activeChannel = null

export function getMapChannel() {
  const topic = mapTopicFromRoot()

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

export default getMapChannel()
