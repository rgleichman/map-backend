import { useEffect, useState } from "react"

let overlayOpen = false

export function isContentOverlayOpen(): boolean {
  return overlayOpen
}

function readOverlayOpen(): boolean {
  return document.body.classList.contains("content-overlay-open")
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
