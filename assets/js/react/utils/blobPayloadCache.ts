import type { BlobFieldType } from "./blobFieldType"
import * as api from "../api/client"

const payloadCache = new Map<string, string>()
const payloadInFlight = new Map<string, Promise<string>>()

function cacheKey(pinId: number, blobType: BlobFieldType, fieldKey: string) {
  return `${pinId}:${blobType}:${fieldKey}`
}

export function invalidateBlobPayloadCache(
  pinId: number,
  blobType: BlobFieldType,
  fieldKey: string
) {
  payloadCache.delete(cacheKey(pinId, blobType, fieldKey))
  payloadInFlight.delete(cacheKey(pinId, blobType, fieldKey))
}

export async function fetchBlobPayload(
  pinId: number,
  blobType: BlobFieldType,
  fieldKey: string
): Promise<string> {
  const key = cacheKey(pinId, blobType, fieldKey)
  const cached = payloadCache.get(key)
  if (cached != null) return cached
  const inflight = payloadInFlight.get(key)
  if (inflight) return inflight
  const p = api
    .getFieldBlob(pinId, blobType, fieldKey)
    .then((res) => {
      const payload = res.data.payload ?? ""
      payloadCache.set(key, payload)
      payloadInFlight.delete(key)
      return payload
    })
    .catch((e) => {
      payloadInFlight.delete(key)
      throw e
    })
  payloadInFlight.set(key, p)
  return p
}
