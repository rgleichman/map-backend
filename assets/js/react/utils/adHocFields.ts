import type { AdHocField, CustomFieldPrimitiveType as CustomFieldPrimitiveTypeName, CustomFieldSchema } from "../types"
import { BlobFieldType } from "./blobFieldType"
import {
  blobFieldDraftPayload,
  inferBlobFieldTypeFromPayload,
  type BlobFieldDraftEntry,
} from "./blobFieldValue"
import { CustomFieldPrimitiveType } from "./customFieldPrimitiveType"
import { formatCustomFieldValue, isCustomFieldEmpty } from "./customFieldValue"

/** Prefix for client-generated ad-hoc field ids (stable across a pin save). */
export const AD_HOC_FIELD_ID_PREFIX = "ad_hoc_"

export const DEFAULT_AD_HOC_FIELD_TYPE: CustomFieldPrimitiveTypeName = CustomFieldPrimitiveType.Text

/** Field kinds an author can pick for an ad-hoc field, in menu order. */
export const AD_HOC_FIELD_TYPE_OPTIONS: { value: AdHocField["type"]; label: string }[] = [
  { value: CustomFieldPrimitiveType.Text, label: "Text" },
  { value: CustomFieldPrimitiveType.Textarea, label: "Long text" },
  { value: CustomFieldPrimitiveType.Number, label: "Number" },
  { value: CustomFieldPrimitiveType.Boolean, label: "Yes / No" },
  { value: CustomFieldPrimitiveType.Url, label: "Link" },
  { value: CustomFieldPrimitiveType.List, label: "List" },
  { value: BlobFieldType.Music, label: "Music" },
  { value: BlobFieldType.Drawing, label: "Drawing" },
]

export function newAdHocFieldId(): string {
  const random = Math.random().toString(36).slice(2, 10)
  return `${AD_HOC_FIELD_ID_PREFIX}${Date.now().toString(36)}_${random}`
}

export function createAdHocField(
  type: AdHocField["type"] = DEFAULT_AD_HOC_FIELD_TYPE
): AdHocField {
  return { id: newAdHocFieldId(), label: "", type }
}

/** Adapt an ad-hoc field to the schema shape shared display/search helpers expect. */
export function adHocFieldSchema(field: AdHocField): CustomFieldSchema {
  return {
    key: field.id,
    label: field.label,
    type: field.type,
    ...(field.options ? { options: field.options } : {}),
  }
}

export function isAdHocFieldEmpty(field: AdHocField): boolean {
  return isCustomFieldEmpty(field.value, adHocFieldSchema(field))
}

export function formatAdHocFieldValue(field: AdHocField): string {
  return formatCustomFieldValue(adHocFieldSchema(field), field.value)
}

/** Plain-text value for search, or null when empty or not text (e.g. blob ref). */
export function searchableAdHocFieldText(field: AdHocField): string | null {
  if (isAdHocFieldEmpty(field)) return null
  const schema = adHocFieldSchema(field)
  if (schema.type === BlobFieldType.Music || schema.type === BlobFieldType.Drawing) return null
  const text = formatCustomFieldValue(schema, field.value)
  return text === "" ? null : text
}

export function updateAdHocField(
  fields: AdHocField[],
  id: string,
  patch: Partial<AdHocField>
): AdHocField[] {
  return fields.map((field) => (field.id === id ? { ...field, ...patch } : field))
}

export function removeAdHocField(fields: AdHocField[], id: string): AdHocField[] {
  return fields.filter((field) => field.id !== id)
}

/** Every field that carries a value needs a label so it can be displayed. */
export function validateAdHocFields(fields: AdHocField[]): string | null {
  for (const field of fields) {
    if (field.label.trim() === "" && !isAdHocFieldEmpty(field)) {
      return "Extra fields need a label"
    }
  }
  return null
}

/** Drop fields with neither label nor value so blank rows are not persisted. */
export function pruneEmptyAdHocFields(fields: AdHocField[]): AdHocField[] {
  return fields.filter((field) => field.label.trim() !== "" || !isAdHocFieldEmpty(field))
}

/**
 * Split blob drafts out of ad-hoc values (uploaded after the pin exists).
 * Drafts are keyed by field id; refs are written back with `applyAdHocFieldRef`.
 */
export function stripAdHocBlobDrafts(fields: AdHocField[]): {
  cleaned: AdHocField[]
  drafts: Record<string, BlobFieldDraftEntry>
} {
  const drafts: Record<string, BlobFieldDraftEntry> = {}
  const cleaned = fields.map((field) => {
    const payload = blobFieldDraftPayload(field.value)
    if (payload == null) return field
    const type =
      field.type === BlobFieldType.Music || field.type === BlobFieldType.Drawing
        ? field.type
        : inferBlobFieldTypeFromPayload(payload)
    if (type == null) return field
    drafts[field.id] = { type, payload }
    const { value: _value, ...rest } = field
    return rest
  })

  return { cleaned, drafts }
}

export function applyAdHocFieldRef(
  fields: AdHocField[],
  id: string,
  value: unknown
): AdHocField[] {
  return updateAdHocField(fields, id, { value })
}
