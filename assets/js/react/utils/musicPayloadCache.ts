import { BlobFieldType } from "./blobFieldType"
import { fetchBlobPayload, invalidateBlobPayloadCache } from "./blobPayloadCache"

export function invalidateMusicPayloadCache(pinId: number, fieldKey: string) {
  invalidateBlobPayloadCache(pinId, BlobFieldType.Music, fieldKey)
}

export async function fetchMusicPayload(pinId: number, fieldKey: string): Promise<string> {
  return fetchBlobPayload(pinId, BlobFieldType.Music, fieldKey)
}

export { fetchBlobPayload, invalidateBlobPayloadCache }
