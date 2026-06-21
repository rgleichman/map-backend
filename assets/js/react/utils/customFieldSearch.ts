import type { CustomFieldSchema, CustomPinType, Pin } from "../types"
import { isBlobFieldDraft, isBlobFieldRef } from "./blobFieldValue"
import { searchableCustomFieldText } from "./customFieldValue"
import { findCustomPinType, isCustomPinType, schemaFields } from "./customPinTypes"

export type CustomFieldSearchHit = {
  field: CustomFieldSchema
  text: string
}

/** Searchable plain-text values from custom_data when schema is unavailable. */
export function rawCustomDataSearchTexts(customData: Record<string, unknown>): string[] {
  const texts: string[] = []
  for (const value of Object.values(customData)) {
    if (value === undefined || value === null || value === "") continue
    if (isBlobFieldRef(value) || isBlobFieldDraft(value)) continue
    if (typeof value === "string") texts.push(value)
    else if (typeof value === "number" || typeof value === "boolean") texts.push(String(value))
    else if (Array.isArray(value)) {
      const joined = value.filter((item) => typeof item === "string").join(", ")
      if (joined) texts.push(joined)
    }
  }
  return texts
}

export function customFieldSearchHits(pin: Pin, catalog: CustomPinType[]): CustomFieldSearchHit[] {
  if (!pin.custom_data || !isCustomPinType(pin.pin_type)) return []

  const customType = findCustomPinType(pin.pin_type, catalog)
  const fields = schemaFields(customType)
  const hits: CustomFieldSearchHit[] = []

  for (const field of fields) {
    const text = searchableCustomFieldText(field, pin.custom_data[field.key])
    if (text) hits.push({ field, text })
  }

  return hits
}

export function pinCustomFieldsMatchQuery(
  pin: Pin,
  query: string,
  catalog?: CustomPinType[]
): boolean {
  const q = query.trim().toLowerCase()
  if (q === "" || !pin.custom_data) return false

  if (catalog && isCustomPinType(pin.pin_type)) {
    for (const { text } of customFieldSearchHits(pin, catalog)) {
      if (text.toLowerCase().includes(q)) return true
    }
    return false
  }

  return rawCustomDataSearchTexts(pin.custom_data).some((text) => text.toLowerCase().includes(q))
}
