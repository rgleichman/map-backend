import type { CatalogPinType, CustomFieldSchema, Pin } from "../types"
import { adHocFieldSchema, searchableAdHocFieldText } from "./adHocFields"
import { isBlobFieldDraft, isBlobFieldRef } from "./blobFieldValue"
import { searchableCustomFieldText } from "./customFieldValue"
import { findPinType, schemaFields } from "./customPinTypes"

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

/** Searchable text from the pin's ad-hoc fields (schema-independent). */
export function adHocFieldSearchHits(pin: Pin): CustomFieldSearchHit[] {
  const hits: CustomFieldSearchHit[] = []
  for (const field of pin.ad_hoc_fields ?? []) {
    const text = searchableAdHocFieldText(field)
    if (text) hits.push({ field: adHocFieldSchema(field), text })
  }
  return hits
}

export function customFieldSearchHits(pin: Pin, catalog: CatalogPinType[]): CustomFieldSearchHit[] {
  const fields = schemaFields(findPinType(pin.pin_type, catalog))
  const hits: CustomFieldSearchHit[] = []

  for (const field of fields) {
    const text = searchableCustomFieldText(field, pin.custom_data?.[field.key])
    if (text) hits.push({ field, text })
  }

  return [...hits, ...adHocFieldSearchHits(pin)]
}

export function pinCustomFieldsMatchQuery(
  pin: Pin,
  query: string,
  catalog?: CatalogPinType[]
): boolean {
  const q = query.trim().toLowerCase()
  if (q === "") return false

  for (const { text } of adHocFieldSearchHits(pin)) {
    if (text.toLowerCase().includes(q)) return true
  }

  if (!pin.custom_data) return false

  if (catalog && findPinType(pin.pin_type, catalog)) {
    for (const { text } of customFieldSearchHits(pin, catalog)) {
      if (text.toLowerCase().includes(q)) return true
    }
    return false
  }

  return rawCustomDataSearchTexts(pin.custom_data).some((text) => text.toLowerCase().includes(q))
}
