import * as api from "../api/client"
import type { Pin } from "../types"
import { invalidateBlobPayloadCache } from "../utils/blobPayloadCache"
import type { BlobFieldDraftEntry } from "../utils/blobFieldValue"

export async function uploadBlobDrafts(
  csrfToken: string | undefined,
  pin: Pin,
  drafts: Record<string, BlobFieldDraftEntry>
): Promise<Pin> {
  let updated = pin
  for (const [fieldKey, { type, payload }] of Object.entries(drafts)) {
    const refValue = await api.upsertFieldBlobAndGetRef(csrfToken, updated.id, type, fieldKey, payload)
    if (refValue !== undefined) {
      invalidateBlobPayloadCache(updated.id, type, fieldKey)
      updated = {
        ...updated,
        custom_data: { ...(updated.custom_data ?? {}), [fieldKey]: refValue },
      }
    }
  }
  return updated
}
