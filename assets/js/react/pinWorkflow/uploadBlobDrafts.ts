import * as api from "../api/client"
import type { Pin } from "../types"
import { applyAdHocFieldRef } from "../utils/adHocFields"
import { invalidateBlobPayloadCache } from "../utils/blobPayloadCache"
import type { BlobFieldDraftEntry } from "../utils/blobFieldValue"

/**
 * Upload blob payloads that could only be stored once the pin existed, then
 * write the returned refs back into `custom_data` / `ad_hoc_fields`.
 */
export async function uploadBlobDrafts(
  csrfToken: string | undefined,
  pin: Pin,
  drafts: Record<string, BlobFieldDraftEntry>,
  adHocDrafts: Record<string, BlobFieldDraftEntry> = {}
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

  for (const [fieldId, { type, payload }] of Object.entries(adHocDrafts)) {
    const refValue = await api.upsertFieldBlobAndGetRef(csrfToken, updated.id, type, fieldId, payload)
    if (refValue !== undefined) {
      invalidateBlobPayloadCache(updated.id, type, fieldId)
      updated = {
        ...updated,
        ad_hoc_fields: applyAdHocFieldRef(updated.ad_hoc_fields ?? [], fieldId, refValue),
      }
    }
  }

  return updated
}
