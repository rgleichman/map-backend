import { gardenNavActive, isMapPathname, LAST_MAP_PATH_KEY } from "./react/mapRoute"

const PAGE_BLEED_CLASS = "md:pb-24"
const GARDENS_DESKTOP_ACTIVE = "bg-base-200/90 dark:bg-base-300/70"
const GARDENS_MOBILE_ACTIVE = "bg-base-300 font-medium"

const lastMapPath = () => {
  try {
    return sessionStorage.getItem(LAST_MAP_PATH_KEY) || "/"
  } catch {
    return "/"
  }
}

const toggleClassList = (el, classString, on) => {
  classString.split(/\s+/).filter(Boolean).forEach((cls) => {
    el.classList.toggle(cls, on)
  })
}

export const syncSiteChrome = () => {
  const pathname = window.location?.pathname || "/"
  const mapPage = isMapPathname(pathname)

  document.querySelectorAll("[data-nav-map-link]").forEach((el) => {
    el.classList.toggle("hidden", mapPage)
  })

  document.querySelectorAll("[data-nav-gardens]").forEach((el) => {
    const active = gardenNavActive(pathname)
    el.setAttribute("aria-current", active ? "page" : "false")
    const isMobile = el.classList.contains("drawer-close")
    toggleClassList(el, isMobile ? GARDENS_MOBILE_ACTIVE : GARDENS_DESKTOP_ACTIVE, active)
  })

  document.querySelectorAll("[data-page-content]").forEach((el) => {
    el.classList.toggle(PAGE_BLEED_CLASS, !mapPage)
  })

  const map = document.getElementById("react-root")
  const overlayOpen = Boolean(document.querySelector("[data-content-overlay]"))
  if (map) {
    if (overlayOpen) {
      map.setAttribute("aria-hidden", "true")
      map.classList.add("pointer-events-none")
    } else {
      map.removeAttribute("aria-hidden")
      map.classList.remove("pointer-events-none")
    }
  }

  const path = lastMapPath()
  document.querySelectorAll("[data-back-to-map]").forEach((el) => {
    el.setAttribute("href", path)
  })
}

export const initSiteChrome = () => {
  syncSiteChrome()
  window.addEventListener("phx:page-loading-stop", syncSiteChrome)
  window.addEventListener("map:route-change", syncSiteChrome)
}
