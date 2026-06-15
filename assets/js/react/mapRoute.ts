/** Normalize pathname: strip trailing slashes; empty becomes "/". */
export function normalizePathname(pathname: string): string {
  const trimmed = (pathname || "").replace(/\/+$/, "")
  return trimmed === "" ? "/" : trimmed
}

/** True for world map (`/`, `/map`) and community maps (`/m/:url/map`). */
export function isMapPathname(pathname: string): boolean {
  const path = normalizePathname(pathname)
  if (path === "/" || path === "/map") return true
  return /^\/m\/[^/]+\/map$/.test(path)
}

/** Community slug from a map pathname, or undefined for the world map. */
export function communityUrlFromPathname(pathname: string): string | undefined {
  const path = normalizePathname(pathname)
  const match = path.match(/^\/m\/([^/]+)\/map$/)
  return match ? decodeURIComponent(match[1]) : undefined
}

/** Path for world or community map scope. */
export function mapPathForScope(communityUrl?: string | null): string {
  if (communityUrl) {
    return `/m/${encodeURIComponent(communityUrl)}/map`
  }
  return "/map"
}

/** Build map path with optional ?pin= query preserved from current location. */
export function mapPathWithPinQuery(communityUrl: string | null | undefined, pinId?: number | null): string {
  const path = mapPathForScope(communityUrl)
  if (pinId != null) {
    return `${path}?pin=${pinId}`
  }
  const pin = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("pin")
    : null
  if (pin) {
    return `${path}?pin=${encodeURIComponent(pin)}`
  }
  return path
}
