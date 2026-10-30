import { useEffect, useState } from "react"

const BODY_CLASS = "content-overlay-open"
const OVERLAY_SELECTOR = "[data-content-overlay]"

let overlayOpen = false
let pendingRelease = false
let pageStopBound = false

export function isContentOverlayOpen(): boolean {
  return overlayOpen
}

function readOverlayOpen(): boolean {
  return typeof document !== "undefined" && document.body.classList.contains(BODY_CLASS)
}

function overlayPresent(): boolean {
  return typeof document !== "undefined" && Boolean(document.querySelector(OVERLAY_SELECTOR))
}

function applyMapInert(inert: boolean): void {
  const map = document.getElementById("react-root")
  if (!map) return
  if (inert) {
    map.setAttribute("aria-hidden", "true")
    map.classList.add("pointer-events-none")
  } else {
    map.removeAttribute("aria-hidden")
    map.classList.remove("pointer-events-none")
  }
}

function applyOpen(): void {
  if (typeof document === "undefined") return
  const already = document.body.classList.contains(BODY_CLASS)
  document.body.classList.add(BODY_CLASS)
  applyMapInert(true)
  overlayOpen = true
  if (!already) {
    window.dispatchEvent(new CustomEvent("map:overlay-open"))
  }
}

function applyClose(): void {
  if (typeof document === "undefined") return
  const wasOpen = document.body.classList.contains(BODY_CLASS)
  document.body.classList.remove(BODY_CLASS)
  applyMapInert(false)
  overlayOpen = false
  if (wasOpen) {
    window.dispatchEvent(new CustomEvent("map:overlay-close"))
  }
}

function bindPageStopCommit(): void {
  if (pageStopBound || typeof window === "undefined") return
  pageStopBound = true
  window.addEventListener("phx:page-loading-stop", commitRelease)
}

function commitRelease(): void {
  if (!pendingRelease) return
  // The dying overlay may still be in the tree; wait for LiveView to finish.
  if (overlayPresent()) return
  pendingRelease = false
  applyClose()
}

/** Mark the document as occupied by a content overlay. Idempotent. */
export function acquireContentOverlay(): void {
  pendingRelease = false
  applyOpen()
}

/**
 * Schedule occupancy close. A replacement overlay that acquires in this turn
 * cancels the close. Commit waits until `[data-content-overlay]` is gone
 * (microtask, then `phx:page-loading-stop` if the dying node is still present).
 */
export function releaseContentOverlay(): void {
  pendingRelease = true
  bindPageStopCommit()
  queueMicrotask(commitRelease)
}

/** Test-only: drop a pending release without touching the DOM. */
export function resetContentOverlayOccupancyForTests(): void {
  pendingRelease = false
  overlayOpen = false
  pageStopBound = false
}

export function bindContentOverlayEvents(): void {
  overlayOpen = readOverlayOpen()
  window.addEventListener("map:overlay-open", () => {
    overlayOpen = true
  })
  window.addEventListener("map:overlay-close", () => {
    overlayOpen = false
  })
}

export function useContentOverlayOpen(): boolean {
  const [open, setOpen] = useState(() => readOverlayOpen())

  useEffect(() => {
    const onOpen = () => setOpen(true)
    const onClose = () => setOpen(false)
    window.addEventListener("map:overlay-open", onOpen)
    window.addEventListener("map:overlay-close", onClose)
    setOpen(readOverlayOpen())
    return () => {
      window.removeEventListener("map:overlay-open", onOpen)
      window.removeEventListener("map:overlay-close", onClose)
    }
  }, [])

  return open
}
