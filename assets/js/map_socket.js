// Map world channel: pin realtime sync for React map and other clients.

import { Socket } from "phoenix"

const userToken =
  document.querySelector('meta[name="user-token"]')?.getAttribute("content") ||
  undefined

const socket = new Socket("/socket", { authToken: userToken })
socket.connect()

const worldChannel = socket.channel("map:world", {})

worldChannel
  .join()
  .receive("ok", (resp) => {
    console.log("World joined successfully", resp)
  })
  .receive("error", (resp) => {
    console.log("Unable to join world channel", resp)
  })

export default worldChannel
