/**
 * Map and garden URL classification and un-verified path builders.
 *
 * Phoenix `router.ex` and `~p` remain the source of truth for navigation.
 * Keep in sync with `lib/storymap_web/map_paths.ex`.
 */

export const ROOT_PATH = "/"
export const WORLD_MAP_PATH = "/map"
export const GARDEN_PREFIX = "/g"
export const LEGACY_GARDEN_PREFIX = "/m"
export const LAST_MAP_PATH_KEY = "mapgarden:lastMapPath"

const GARDEN_PREFIXES = [GARDEN_PREFIX, LEGACY_GARDEN_PREFIX] as const

const escapeRe = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Single-segment garden map: `/g/:url/map`, plus legacy `/m/:url/map`. */
const GARDEN_MAP_PATH = new RegExp(
  `^(?:${GARDEN_PREFIXES.map(escapeRe).join("|")})/([^/]+)/map$`,
)

/** Normalize pathname: strip trailing slashes; empty becomes "/". */
export function normalizePathname(pathname: string): string {
  const trimmed = (pathname || "").replace(/\/+$/, "")
  return trimmed === "" ? ROOT_PATH : trimmed
}

/** True for world map (`/`, `/map`) and garden maps (`/g/.../map`, legacy `/m`). */
export function isMapPathname(pathname: string): boolean {
  const path = normalizePathname(pathname)
  if (path === ROOT_PATH || path === WORLD_MAP_PATH) return true
  return GARDEN_PREFIXES.some((prefix) => path.startsWith(`${prefix}/`) && path.endsWith("/map"))
}

/** True when the Gardens nav item should be current (index or garden pages, not maps). */
export function gardenNavActive(pathname: string): boolean {
  const path = normalizePathname(pathname)
  if (path === GARDEN_PREFIX || path === LEGACY_GARDEN_PREFIX) return true
  return GARDEN_PREFIXES.some(
    (prefix) => path.startsWith(`${prefix}/`) && !path.endsWith("/map"),
  )
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
    return `${GARDEN_PREFIX}/${encodeURIComponent(communityUrl)}/map`
  }
  return WORLD_MAP_PATH
}

/** Persist the current map URL so overlay close can return here. */
export function rememberLastMapPath(
  pathname: string = typeof window !== "undefined" ? window.location.pathname : ROOT_PATH,
  search: string = typeof window !== "undefined" ? window.location.search : "",
): void {
  if (typeof window === "undefined") return
  if (!isMapPathname(pathname)) return
  const path = normalizePathname(pathname)
  const url = search && search !== "?" ? `${path}${search}` : path
  try {
    sessionStorage.setItem(LAST_MAP_PATH_KEY, url)
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent("map:route-change"))
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

/** Parse a same-origin map URL with a `?pin=` query, or null if not a map pin link. */
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
