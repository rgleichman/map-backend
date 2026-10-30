import { LAST_MAP_PATH_KEY } from "../react/mapRoute"
import { acquireContentOverlay, releaseContentOverlay } from "../react/utils/contentOverlay"

const lastMapPath = () => {
  try {
    return sessionStorage.getItem(LAST_MAP_PATH_KEY) || "/"
  } catch {
    return "/"
  }
}

const closeOverlay = (el) => {
  if (document.querySelector("[data-confirm-modal]")) return
  const close = el.querySelector("[data-back-to-map]")
  if (!close) return
  const path = lastMapPath()
  close.setAttribute("href", path)
  close.click()
}

export const ContentOverlay = {
  mounted() {
    this._overlayAbort?.abort()
    this._overlayAbort = new AbortController()
    const { signal } = this._overlayAbort

    const close = this.el.querySelector("[data-back-to-map]")
    if (close) close.setAttribute("href", lastMapPath())

    acquireContentOverlay()

    window.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Escape") return
        event.preventDefault()
        closeOverlay(this.el)
      },
      { signal },
    )
    this.el.addEventListener(
      "click",
      (event) => {
        if (!(event.target instanceof Element)) return
        if (!event.target.hasAttribute("data-overlay-backdrop")) return
        closeOverlay(this.el)
      },
      { signal },
    )
  },
  destroyed() {
    this._overlayAbort?.abort()
    this._overlayAbort = undefined
    releaseContentOverlay()
  },
}
