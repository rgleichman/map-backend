import { isMapPathname } from "../mapRoute"

function clickPhxLink(href: string, type: "patch" | "redirect", state: "push" | "replace"): void {
  const a = document.createElement("a")
  a.href = href
  a.setAttribute("data-phx-link", type)
  a.setAttribute("data-phx-link-state", state)
  a.style.display = "none"
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** LiveView patch (same MapLive, world ↔ garden). No-op on overlay URLs. */
export function livePatch(href: string, replace = false): void {
  if (typeof window === "undefined") return
  if (!isMapPathname(window.location.pathname)) return
  clickPhxLink(href, "patch", replace ? "replace" : "push")
}

export function liveLinkProps(href: string): {
  href: string
  "data-phx-link": "redirect"
  "data-phx-link-state": "push"
} {
  return {
    href,
    "data-phx-link": "redirect",
    "data-phx-link-state": "push",
  }
}
