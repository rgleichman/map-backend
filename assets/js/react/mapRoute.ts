/** Normalize pathname: strip trailing slashes; empty becomes "/". */
export function normalizePathname(pathname: string): string {
  const trimmed = (pathname || "").replace(/\/+$/, "")
  return trimmed === "" ? "/" : trimmed
}

/** Garden map path: `/g/:url/map`, plus legacy `/m/:url/map`. */
const GARDEN_MAP_PATH = /^\/(?:g|m)\/([^/]+)\/map$/

/** True for world map (`/`, `/map`) and garden maps (`/g/:url/map`, legacy `/m`). */
export function isMapPathname(pathname: string): boolean {
  const path = normalizePathname(pathname)
  if (path === "/" || path === "/map") return true
  return GARDEN_MAP_PATH.test(path)
}

/** Community slug from a map pathname, or undefined for the world map. */
export function communityUrlFromPathname(pathname: string): string | undefined {
  const path = normalizePathname(pathname)
  const match = path.match(GARDEN_MAP_PATH)
  return match ? decodeURIComponent(match[1]) : undefined
}

/** Path for world or garden map scope. Canonical prefix is `/g`. */
export function mapPathForScope(communityUrl?: string | null): string {
  if (communityUrl) {
    return `/g/${encodeURIComponent(communityUrl)}/map`
  }
  return "/map"
}

/** Build map path with an explicit ?pin= query, if any. */
export function mapPathWithPinQuery(communityUrl: string | null | undefined, pinId?: number | null): string {
  const path = mapPathForScope(communityUrl)
  if (pinId != null) {
    return `${path}?pin=${pinId}`
  }
  return path
}

export type SetCommunityScopeOptions = {
  replace?: boolean
  pinId?: number | null
}

/** Pin id from a `?pin=` query string, or null if absent or invalid. */
export function parsePinIdFromSearch(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): number | null {
  const p = new URLSearchParams(search).get("pin")
  const n = p ? parseInt(p, 10) : NaN
  return Number.isInteger(n) ? n : null
}

export type MapPinLink = {
  pinId: number
  communityUrl?: string
}

/** Parse a same-origin map URL with a ?pin= query, or null if not a map pin link. */
export function parseMapPinLink(href: string, origin = typeof window !== "undefined" ? window.location.origin : ""): MapPinLink | null {
  if (!origin) return null

  let url: URL
  try {
    url = new URL(href, origin)
  } catch {
    return null
  }

  if (url.origin !== origin) return null
  if (!isMapPathname(url.pathname)) return null

  const pinParam = url.searchParams.get("pin")
  const pinId = pinParam ? parseInt(pinParam, 10) : NaN
  if (!Number.isInteger(pinId)) return null

  return {
    pinId,
    communityUrl: communityUrlFromPathname(url.pathname),
  }
}
