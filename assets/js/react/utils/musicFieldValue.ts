import type { CustomFieldSchema } from "../types"
import { scoreHasContent, parseScore } from "./musicScore"

export type MusicFieldDraft = { draft: string }

export function isMusicFieldDraft(value: unknown): value is MusicFieldDraft {
  return (
    value != null &&
    typeof value === "object" &&
    "draft" in (value as Record<string, unknown>) &&
    typeof (value as MusicFieldDraft).draft === "string"
  )
}

export function musicFieldDraftPayload(value: unknown): string | null {
  if (!isMusicFieldDraft(value)) return null
  const payload = value.draft.trim()
  return payload === "" ? null : payload
}

export function musicFieldDraftHasContent(value: unknown): boolean {
  const payload = musicFieldDraftPayload(value)
  if (!payload) return false
  return scoreHasContent(parseScore(payload))
}

export function stripMusicDraftsFromCustomData(
  customData: Record<string, unknown>,
  fields: CustomFieldSchema[] = []
): { cleaned: Record<string, unknown>; drafts: Record<string, string> } {
  const cleaned = { ...customData }
  const drafts: Record<string, string> = {}
  const musicFieldKeys = new Set(fields.filter((field) => field.type === "music").map((field) => field.key))

  for (const [key, value] of Object.entries(customData)) {
    const payload = musicFieldDraftPayload(value)
    if (payload == null) continue
    if (musicFieldKeys.size > 0 && !musicFieldKeys.has(key)) continue
    drafts[key] = payload
    delete cleaned[key]
  }

  return { cleaned, drafts }
}
