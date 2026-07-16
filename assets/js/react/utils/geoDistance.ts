/** Earth mean radius in meters (WGS84 approximation). */
const EARTH_RADIUS_M = 6_371_000

/** Default radius for "pin is near your location" privacy confirmation. */
export const NEAR_USER_PIN_THRESHOLD_M = 250

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/** Great-circle distance between two WGS84 points, in meters. */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
}

export function isPinNearUserLocation(
  pinLat: number,
  pinLng: number,
  userLat: number,
  userLng: number,
  thresholdM: number = NEAR_USER_PIN_THRESHOLD_M,
): boolean {
  return haversineMeters(pinLat, pinLng, userLat, userLng) <= thresholdM
}
