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
