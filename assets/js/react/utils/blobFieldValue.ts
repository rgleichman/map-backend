import type { CustomFieldSchema } from "../types"
import { BlobFieldType, isBlobFieldType } from "./blobFieldType"
import type { BlobFieldType as BlobFieldKind } from "./blobFieldType"

export type BlobFieldDraft = { draft: string }
export type BlobFieldRef = { ref: string | number }

export function isBlobFieldDraft(value: unknown): value is BlobFieldDraft {
  return (
    value != null &&
    typeof value === "object" &&
    "draft" in (value as Record<string, unknown>) &&
    typeof (value as BlobFieldDraft).draft === "string"
  )
}

export function isBlobFieldRef(value: unknown): value is BlobFieldRef {
  return (
    value != null &&
    typeof value === "object" &&
    "ref" in (value as Record<string, unknown>) &&
    (typeof (value as BlobFieldRef).ref === "string" ||
      typeof (value as BlobFieldRef).ref === "number")
  )
}

export function blobFieldDraftPayload(value: unknown): string | null {
  if (!isBlobFieldDraft(value)) return null
  const payload = value.draft.trim()
  return payload === "" ? null : payload
}

export type BlobFieldDraftEntry = { type: BlobFieldKind; payload: string }

/** Infer blob field kind from draft JSON when schema is unavailable. */
export function inferBlobFieldTypeFromPayload(payload: string): BlobFieldKind | null {
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>
    if (parsed != null && typeof parsed === "object") {
      if (Array.isArray(parsed.strokes)) return BlobFieldType.Drawing
      if (Array.isArray(parsed.rows)) return BlobFieldType.Music
    }
  } catch {
    // ignore invalid JSON
  }
  return null
}

export function stripBlobDraftsFromCustomData(
  customData: Record<string, unknown>,
  fields: CustomFieldSchema[] = []
): { cleaned: Record<string, unknown>; drafts: Record<string, BlobFieldDraftEntry> } {
  const cleaned = { ...customData }
  const drafts: Record<string, BlobFieldDraftEntry> = {}
  const blobFields = new Map(
    fields
      .filter((field): field is CustomFieldSchema & { type: BlobFieldKind } =>
        isBlobFieldType(field.type)
      )
      .map((field) => [field.key, field.type])
  )

  for (const [key, value] of Object.entries(customData)) {
    const payload = blobFieldDraftPayload(value)
    if (payload == null) continue
    const schemaType = blobFields.get(key)
    if (blobFields.size > 0 && schemaType == null) continue
    const type = schemaType ?? inferBlobFieldTypeFromPayload(payload)
    if (type == null) continue
    drafts[key] = { type, payload }
    delete cleaned[key]
  }

  return { cleaned, drafts }
}

export function blobFieldKeys(fields: CustomFieldSchema[]): Set<string> {
  return new Set(fields.filter((field) => isBlobFieldType(field.type)).map((field) => field.key))
}
