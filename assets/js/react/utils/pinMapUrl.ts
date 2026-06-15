import type { Pin } from "../types"
import { communityUrlFromPathname, normalizePathname } from "../mapRoute"

const COMMUNITY_TAG_PREFIX = "community:"

export function communityUrlFromTag(tag: string): string | null {
  if (!tag.startsWith(COMMUNITY_TAG_PREFIX)) return null
  const url = tag.slice(COMMUNITY_TAG_PREFIX.length)
  return url || null
}

/** Base map path for a pin (no query string). */
export function pinMapPath(pin?: Pick<Pin, "community">): string {
  if (pin?.community?.community_url) {
    return `/m/${encodeURIComponent(pin.community.community_url)}/map`
  }

  if (typeof window === "undefined") return "/map"

  const path = normalizePathname(window.location.pathname || "/map")
  if (path === "/" || path === "/map") return "/map"
  if (/^\/m\/[^/]+\/map$/.test(path)) return path
  return "/map"
}

/** Full shareable URL for a pin on its canonical map. */
export function pinMapUrl(
  pin: Pick<Pin, "id" | "community">,
  origin = typeof window !== "undefined" ? window.location.origin : ""
): string {
  return `${origin}${pinMapPath(pin)}?pin=${pin.id}`
}
