// Phoenix channels: `map_socket.js` connects the map world channel for pin realtime sync.

// You can include dependencies in two ways.
//
// The simplest option is to put them in assets/vendor and
// import them using relative paths:
//
//     import "../vendor/some-package.js"
//
// Alternatively, you can `npm install some-package --prefix assets` and import
// them using a path starting with the package name:
//
//     import "some-package"
//
// If you have dependencies that try to import CSS, esbuild will generate a separate `app.css` file.
// To load it, simply add a second `<link>` to your `root.html.heex` file.

// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html"
// Establish Phoenix Socket and LiveView configuration.
import { Socket } from "phoenix"
import { LiveSocket } from "phoenix_live_view"
import { hooks as colocatedHooks } from "phoenix-colocated/storymap"
import { LocalTime } from "./hooks/local_time"
import topbar from "../vendor/topbar"
import "./map_socket.js"
// React map is loaded dynamically below when #react-root is present

const csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content")
const liveSocket = new LiveSocket("/live", Socket, {
  longPollFallbackMs: 2500,
  params: { _csrf_token: csrfToken },
  hooks: { ...colocatedHooks, LocalTime },
})

// Show progress bar on live navigation and form submits
topbar.config({ barColors: { 0: "#29d" }, shadowColor: "rgba(0, 0, 0, .3)" })
window.addEventListener("phx:page-loading-start", _info => topbar.show(300))
window.addEventListener("phx:page-loading-stop", _info => topbar.hide())

// connect if there are any LiveViews on the page
liveSocket.connect()

// expose liveSocket on window for web console debug logs and latency simulation:
// >> liveSocket.enableDebug()
// >> liveSocket.enableLatencySim(1000)  // enabled for duration of browser session
// >> liveSocket.disableLatencySim()
window.liveSocket = liveSocket

// The lines below enable quality of life phoenix_live_reload
// development features:
//
//     1. stream server logs to the browser console
//     2. click on elements to jump to their definitions in your code editor
//
if (process.env.NODE_ENV === "development") {
  window.addEventListener("phx:live_reload:attached", ({ detail: reloader }) => {
    // Enable server log streaming to client.
    // Disable with reloader.disableServerLogs()
    reloader.enableServerLogs()

    // Open configured PLUG_EDITOR at file:line of the clicked element's HEEx component
    //
    //   * click with "c" key pressed to open at caller location
    //   * click with "d" key pressed to open at function component definition location
    let keyDown
    window.addEventListener("keydown", e => keyDown = e.key)
    window.addEventListener("keyup", e => keyDown = null)
    window.addEventListener("click", e => {
      if (keyDown === "c") {
        e.preventDefault()
        e.stopImmediatePropagation()
        reloader.openEditorAtCaller(e.target)
      } else if (keyDown === "d") {
        e.preventDefault()
        e.stopImmediatePropagation()
        reloader.openEditorAtDef(e.target)
      }
    }, true)

    window.liveReloader = reloader
  })
}

// Conditionally mount React app on pages that include #react-root
const reactRoot = document.getElementById("react-root")
if (reactRoot) {
  import("./react/main.tsx")
}

// Best-effort client-side caching for MapTiler requests (tiles/sprites/glyphs).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("Service worker registration failed", err)
    })
  })
}

// Party mode toggle
let partyModeInterval = null
let partyModeTimeout = null

const stopPartyMode = (partyButton) => {
  document.documentElement.classList.remove("party-mode")
  document.body.classList.remove("party-mode")
  clearInterval(partyModeInterval)
  partyModeInterval = null
  if (partyModeTimeout) {
    clearTimeout(partyModeTimeout)
    partyModeTimeout = null
  }
  document.documentElement.style.filter = ""
  document.body.style.filter = ""
  // Update all party buttons
  const partyButtons = [
    document.getElementById("party-button"),
    document.getElementById("party-button-mobile")
  ].filter(Boolean)
  partyButtons.forEach(btn => {
    if (btn) btn.textContent = "🎉 Party"
  })
}

const initPartyMode = () => {
  const partyButtons = [
    document.getElementById("party-button"),
    document.getElementById("party-button-mobile")
  ].filter(Boolean)

  partyButtons.forEach(partyButton => {
    if (!partyButton.dataset.partyInitialized) {
      partyButton.dataset.partyInitialized = "true"
      partyButton.addEventListener("click", () => {
        const isActive = document.body.classList.contains("party-mode")

        if (isActive) {
          stopPartyMode(partyButtons[0] || partyButtons[1])
        } else {
          document.documentElement.classList.add("party-mode")
          document.body.classList.add("party-mode")
          partyButtons.forEach(btn => btn.textContent = "🛑 Stop")

          let hue = 0
          partyModeInterval = setInterval(() => {
            hue = (hue + 5) % 360
            const filter = `hue-rotate(${hue}deg) brightness(1.8) saturate(2.5)`
            document.documentElement.style.filter = filter
            document.body.style.filter = filter
          }, 50)

          // Auto-stop after 60 seconds
          partyModeTimeout = setTimeout(() => {
            stopPartyMode(partyButtons[0] || partyButtons[1])
          }, 60000)
        }
      })
    }
  })
}

// Initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPartyMode)
} else {
  initPartyMode()
}

// Re-initialize after LiveView navigation
window.addEventListener("phx:page-loading-stop", initPartyMode)

// Desktop floating footer active link highlighting.
// The footer lives in the root layout (outside LiveView inner content), so it doesn't re-render
// on navigation. Instead, update active styles on page load + LiveView navigation.
const initFooterNavActive = () => {
  const normalizePath = (p) => {
    const trimmed = (p || "").replace(/\/+$/, "")
    return trimmed === "" ? "/" : trimmed
  }
  const currentPath = normalizePath(window.location?.pathname)
  const nodes = Array.from(document.querySelectorAll("[data-footer-nav][data-footer-path]"))
  nodes.forEach((node) => {
    const expected = normalizePath(node.getAttribute("data-footer-path"))
    const activeClasses = (node.getAttribute("data-footer-active-classes") || "").split(" ").filter(Boolean)
    const isActive = expected === currentPath
    node.setAttribute("aria-current", isActive ? "page" : "false")
    activeClasses.forEach((cls) => node.classList.toggle(cls, isActive))
  })
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFooterNavActive)
} else {
  initFooterNavActive()
}

window.addEventListener("phx:page-loading-stop", initFooterNavActive)

// Close drawer when clicking drawer-close elements
const initDrawerClose = () => {
  document.querySelectorAll(".drawer-close").forEach(element => {
    if (!element.dataset.drawerCloseInitialized) {
      element.dataset.drawerCloseInitialized = "true"
      element.addEventListener("click", () => {
        const drawerToggle = document.getElementById("drawer-toggle")
        if (drawerToggle) {
          drawerToggle.checked = false
        }
      })
    }
  })
}

// Initialize drawer close handlers
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDrawerClose)
} else {
  initDrawerClose()
}

// Re-initialize after LiveView navigation
window.addEventListener("phx:page-loading-stop", initDrawerClose)

// Format <time data-utc="..."> nodes into local time.
const initLocalTimes = () => {
  const nodes = Array.from(document.querySelectorAll("time[data-utc]"))
  if (nodes.length === 0) return

  const formatter = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  nodes.forEach((node) => {
    const iso = node.getAttribute("data-utc")
    if (!iso) return
    const date = new Date(iso)
    if (isNaN(date.getTime())) return
    node.textContent = formatter.format(date)
    node.setAttribute("title", Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time")
  })
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLocalTimes)
} else {
  initLocalTimes()
}

window.addEventListener("phx:page-loading-stop", initLocalTimes)

