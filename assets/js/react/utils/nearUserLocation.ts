import { isPinNearUserLocation, NEAR_USER_PIN_THRESHOLD_M } from "./geoDistance"

/** Match MapCanvas: reuse a recent fix; avoid a high-accuracy prompt. */
const POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 20 * 60 * 1000,
}

async function geolocationPermissionGranted(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return false
  }
  try {
    const status = await navigator.permissions.query({ name: "geolocation" })
    return status.state === "granted"
  } catch {
    // Missing or unsupported permission name — do not call getCurrentPosition
    // (that could prompt the user).
    return false
  }
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, POSITION_OPTIONS)
  })
}

/**
 * Client-only: whether the pin is near the device location.
 * Returns false when permission is not already granted, geo fails, or accuracy is poor.
 * Never sends coordinates to a server.
 */
export async function isPinNearDeviceLocation(
  pinLat: number,
  pinLng: number,
  thresholdM: number = NEAR_USER_PIN_THRESHOLD_M,
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return false
  }
  if (!(await geolocationPermissionGranted())) {
    return false
  }

  let position: GeolocationPosition
  try {
    position = await getCurrentPosition()
  } catch {
    return false
  }

  const { latitude, longitude, accuracy } = position.coords
  if (typeof accuracy === "number" && Number.isFinite(accuracy) && accuracy > 2 * thresholdM) {
    return false
  }

  return isPinNearUserLocation(pinLat, pinLng, latitude, longitude, thresholdM)
}
