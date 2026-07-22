import { isPinNearUserLocation, NEAR_USER_PIN_THRESHOLD_M } from "./geoDistance"

/** Same window as MapCanvas geolocate `maximumAge`. */
const CACHE_MAX_AGE_MS = 20 * 60 * 1000

type CachedDeviceLocation = {
  latitude: number
  longitude: number
  accuracy: number | null
  cachedAt: number
}

let cachedLocation: CachedDeviceLocation | null = null

/**
 * Store a device fix obtained elsewhere (e.g. MapCanvas auto-center / locate button).
 * Never sends coordinates to a server.
 */
export function cacheDeviceLocation(coords: {
  latitude: number
  longitude: number
  accuracy?: number | null
}): void {
  const accuracy =
    typeof coords.accuracy === "number" && Number.isFinite(coords.accuracy) ? coords.accuracy : null
  cachedLocation = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy,
    cachedAt: Date.now(),
  }
}

/** Test helper: clear the in-memory device location cache. */
export function clearCachedDeviceLocation(): void {
  cachedLocation = null
}

function getCachedDeviceLocation(): CachedDeviceLocation | null {
  if (cachedLocation == null) return null
  if (Date.now() - cachedLocation.cachedAt > CACHE_MAX_AGE_MS) {
    cachedLocation = null
    return null
  }
  return cachedLocation
}

/**
 * Whether the pin is near the last cached device location.
 * Returns false when there is no recent cache, accuracy is poor, or the pin is far.
 * Does not request geolocation (avoids prompts and Permissions API gaps on Firefox/Safari).
 */
export function isPinNearDeviceLocation(
  pinLat: number,
  pinLng: number,
  thresholdM: number = NEAR_USER_PIN_THRESHOLD_M,
): boolean {
  const loc = getCachedDeviceLocation()
  if (loc == null) return false

  if (loc.accuracy != null && loc.accuracy > 4 * thresholdM) {
    return false
  }

  return isPinNearUserLocation(pinLat, pinLng, loc.latitude, loc.longitude, thresholdM)
}
