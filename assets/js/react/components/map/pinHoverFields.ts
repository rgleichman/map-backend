import type { CatalogPinType, CustomFieldSchema, Pin } from "../../types"
import { adHocFieldSchema } from "../../utils/adHocFields"
import { BlobFieldType, isBlobFieldType } from "../../utils/blobFieldType"
import { isCustomFieldEmpty, formatCustomFieldValue } from "../../utils/customFieldValue"
import { findPinType, schemaFields } from "../../utils/customPinTypes"
import { formatDateTime, rruleToHumanReadable } from "../../utils/popupFormatters"

export type PinHoverTextRow = {
  kind: "text"
  id: string
  label?: string
  text: string
  /** Description gets a slightly taller line-clamp. */
  emphasis?: "description"
}

export type PinHoverDrawingRow = {
  kind: "drawing"
  id: string
  label: string
  field: CustomFieldSchema
  value: unknown
}

export type PinHoverMusicRow = {
  kind: "music"
  id: string
  label: string
  field: CustomFieldSchema
  value: unknown
}

export type PinHoverRow = PinHoverTextRow | PinHoverDrawingRow | PinHoverMusicRow

const MIN_HOVER_SIZE_PX = 160

/** Cap hover tooltip to roughly one-third of the map, with a usable floor. */
export function hoverPopupMaxSize(
  mapWidth: number,
  mapHeight: number
): { maxWidth: number; maxHeight: number } {
  return {
    maxWidth: Math.max(MIN_HOVER_SIZE_PX, Math.floor(mapWidth / 3)),
    maxHeight: Math.max(MIN_HOVER_SIZE_PX, Math.floor(mapHeight / 3)),
  }
}

function pushFieldRow(
  rows: PinHoverRow[],
  field: CustomFieldSchema,
  value: unknown,
  idPrefix: string
): void {
  if (isCustomFieldEmpty(value, field)) return

  if (field.type === BlobFieldType.Drawing) {
    rows.push({ kind: "drawing", id: `${idPrefix}${field.key}`, label: field.label, field, value })
    return
  }
  if (field.type === BlobFieldType.Music) {
    rows.push({ kind: "music", id: `${idPrefix}${field.key}`, label: field.label, field, value })
    return
  }
  if (isBlobFieldType(field.type)) return

  const text = formatCustomFieldValue(field, value)
  if (!text) return
  rows.push({ kind: "text", id: `${idPrefix}${field.key}`, label: field.label, text })
}

/** Ordered hover rows matching detail-panel field order (no tags/actions). */
export function buildPinHoverRows(pin: Pin, catalog: CatalogPinType[]): PinHoverRow[] {
  const rows: PinHoverRow[] = []

  const description = pin.description?.trim()
  if (description) {
    rows.push({
      kind: "text",
      id: "description",
      text: description,
      emphasis: "description",
    })
  }

  for (const field of schemaFields(findPinType(pin.pin_type, catalog))) {
    pushFieldRow(rows, field, pin.custom_data?.[field.key], "field:")
  }

  for (const adHoc of pin.ad_hoc_fields ?? []) {
    if (adHoc.label.trim() === "") continue
    pushFieldRow(rows, adHocFieldSchema(adHoc), adHoc.value, "ad_hoc:")
  }

  if (pin.start_time && pin.end_time) {
    rows.push({
      kind: "text",
      id: "times",
      label: "When",
      text: `${formatDateTime(pin.start_time)} – ${formatDateTime(pin.end_time)}`,
    })
  } else if (pin.start_time) {
    rows.push({
      kind: "text",
      id: "times",
      label: "Starts",
      text: formatDateTime(pin.start_time),
    })
  } else if (pin.end_time) {
    rows.push({
      kind: "text",
      id: "times",
      label: "Ends",
      text: formatDateTime(pin.end_time),
    })
  }

  if (pin.schedule_rrule) {
    rows.push({
      kind: "text",
      id: "schedule",
      label: "Schedule",
      text: rruleToHumanReadable(pin.schedule_rrule),
    })
  }

  return rows
}
