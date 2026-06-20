export {
  isBlobFieldDraft as isMusicFieldDraft,
  blobFieldDraftPayload as musicFieldDraftPayload,
} from "./blobFieldValue"

import { scoreHasContent, parseScore } from "./musicScore"
import { blobFieldDraftPayload, isBlobFieldDraft } from "./blobFieldValue"

export function musicFieldDraftHasContent(value: unknown): boolean {
  const payload = blobFieldDraftPayload(value)
  if (!payload) return false
  return scoreHasContent(parseScore(payload))
}

export { stripBlobDraftsFromCustomData as stripMusicDraftsFromCustomData } from "./blobFieldValue"
