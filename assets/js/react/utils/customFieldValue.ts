import type { CustomFieldSchema } from "../types"
import { isBlobFieldDraft, isBlobFieldRef } from "./blobFieldValue"
import { BlobFieldType, isBlobFieldType } from "./blobFieldType"
import { drawingHasContent, parseDrawing } from "./drawingPayload"
import { musicFieldDraftHasContent } from "./musicFieldValue"

function blobDraftHasContent(field: CustomFieldSchema | undefined, value: unknown): boolean {
  if (!isBlobFieldDraft(value)) return false
  const payload = value.draft.trim()
  if (!payload) return false

  if (field && isBlobFieldType(field.type)) {
    if (field.type === BlobFieldType.Music) return musicFieldDraftHasContent(value)
    if (field.type === BlobFieldType.Drawing) {
      return drawingHasContent(parseDrawing(payload))
    }
  }

  try {
    const parsed = JSON.parse(payload) as { strokes?: unknown[]; rows?: unknown[] }
    if (Array.isArray(parsed.strokes)) {
      return drawingHasContent(parseDrawing(payload))
    }
    if (Array.isArray(parsed.rows)) {
      return musicFieldDraftHasContent(value)
    }
  } catch {
    return false
  }
  return false
}

export function isCustomFieldEmpty(value: unknown, field?: CustomFieldSchema): boolean {
  if (value === undefined || value === null || value === "") return true
  if (Array.isArray(value) && value.length === 0) return true
  if (isBlobFieldDraft(value)) {
    const payload = value.draft.trim()
    if (!payload) return true
    return !blobDraftHasContent(field, value)
  }
  if (isBlobFieldRef(value)) return false
  if (typeof value === "object" && value != null && "ref" in (value as Record<string, unknown>)) {
    return true
  }
  return false
}

/** Plain-text representation of a primitive custom field value (not blob payloads). */
export function formatCustomFieldValue(field: CustomFieldSchema, value: unknown): string {
  if (value === undefined || value === null) return ""
  if (field.type === "boolean") return value === true ? "Yes" : "No"
  if (field.type === "list" && Array.isArray(value)) return value.join(", ")
  if (field.type === "select") {
    const opt = field.options?.find((o) => o.value === value)
    return opt?.label ?? String(value)
  }
  return String(value)
}

/** Searchable text for a schema field, or null when empty or not plain-text (e.g. blob ref). */
export function searchableCustomFieldText(field: CustomFieldSchema, value: unknown): string | null {
  if (isBlobFieldType(field.type)) return null
  if (isBlobFieldRef(value) || isBlobFieldDraft(value)) return null
  if (isCustomFieldEmpty(value, field)) return null
  const text = formatCustomFieldValue(field, value)
  return text === "" ? null : text
}
