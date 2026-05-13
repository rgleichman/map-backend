// NOTE: This file is imported from `assets/js/app.js` when channels are enabled.

// Bring in Phoenix channels client library:
import { Socket } from "phoenix"

// And connect to the path in "lib/storymap_web/endpoint.ex". We pass the
// token for authentication (from meta tag set by the server).
//
// Read the [`Using Token Authentication`](https://hexdocs.pm/phoenix/channels.html#using-token-authentication)
// section to see how the token should be used.
const userToken =
  document.querySelector('meta[name="user-token"]')?.getAttribute("content") ||
  undefined
let socket = new Socket("/socket", { authToken: userToken })
socket.connect()

// Now that you are connected, you can join channels with a topic.
// Let's assume you have a channel with a topic named `room` and the
// subtopic is its id - in this case 42:
let worldChannel = socket.channel("map:world", {})

worldChannel.join()
  .receive("ok", resp => { console.log("World joined successfully", resp) })
  .receive("error", resp => { console.log("Unable to join world channel", resp) })

const updateAdminUnreadBadges = (unreadCount) => {
  const ids = ["admin-activity-unread-badge", "admin-activity-unread-badge-mobile"]
  ids.forEach((id) => {
    const el = document.getElementById(id)
    if (!el) return

    if (unreadCount > 0) {
      el.textContent = String(unreadCount)
      el.classList.remove("hidden")
    } else {
      el.textContent = ""
      el.classList.add("hidden")
    }
  })
}

const refreshAdminUnreadCount = async () => {
  try {
    const resp = await fetch("/api/admin/activity/unread-count", {
      method: "GET",
      credentials: "same-origin",
      headers: { accept: "application/json" },
    })

    if (!resp.ok) return
    const data = await resp.json()
    const count = typeof data?.unread_count === "number" ? data.unread_count : 0
    updateAdminUnreadBadges(count)
  } catch (_e) {
    // ignore
  }
}

// If admin bell is present, join admin activity channel and update count on events.
const hasAdminBell =
  document.getElementById("admin-activity-unread-badge") ||
  document.getElementById("admin-activity-unread-badge-mobile")

if (hasAdminBell) {
  const adminChannel = socket.channel("admin:activity", {})

  adminChannel
    .join()
    .receive("ok", () => refreshAdminUnreadCount())
    .receive("error", () => {
      // not an admin / not authed
    })

  adminChannel.on("new_event", () => refreshAdminUnreadCount())

  // Also refresh after LiveView navigation
  window.addEventListener("phx:page-loading-stop", refreshAdminUnreadCount)
}

// channel.on("marker_added", payload => {
//   console.log("Marker added", payload)
// })

// export default socket
export default worldChannel
