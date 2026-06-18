import * as api from "../api/client"

const musicPayloadCache = new Map<string, string>()
const musicPayloadInFlight = new Map<string, Promise<string>>()

function cacheKey(pinId: number, fieldKey: string) {
  return `${pinId}:${fieldKey}`
}

export function invalidateMusicPayloadCache(pinId: number, fieldKey: string) {
  musicPayloadCache.delete(cacheKey(pinId, fieldKey))
  musicPayloadInFlight.delete(cacheKey(pinId, fieldKey))
}

export async function fetchMusicPayload(pinId: number, fieldKey: string): Promise<string> {
  const key = cacheKey(pinId, fieldKey)
  const cached = musicPayloadCache.get(key)
  if (cached != null) return cached
  const inflight = musicPayloadInFlight.get(key)
  if (inflight) return inflight
  const p = api
    .getMusicField(pinId, fieldKey)
    .then((res) => {
      const payload = res.data.payload ?? ""
      musicPayloadCache.set(key, payload)
      musicPayloadInFlight.delete(key)
      return payload
    })
    .catch((e) => {
      musicPayloadInFlight.delete(key)
      throw e
    })
  musicPayloadInFlight.set(key, p)
  return p
}
