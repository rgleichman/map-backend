import type { CustomFieldSchema, CustomPinType, Pin } from "../../types"
import { BlobFieldType, isBlobFieldType } from "../../utils/blobFieldType"
import { isCustomFieldEmpty, formatCustomFieldValue } from "../../utils/customFieldValue"
import { findCustomPinType, isCustomPinType, schemaFields } from "../../utils/customPinTypes"
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

/** Ordered hover rows matching detail-panel field order (no tags/actions). */
export function buildPinHoverRows(pin: Pin, catalog: CustomPinType[]): PinHoverRow[] {
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

  const customType = isCustomPinType(pin.pin_type) ? findCustomPinType(pin.pin_type, catalog) : undefined
  for (const field of schemaFields(customType)) {
    const value = pin.custom_data?.[field.key]
    if (isCustomFieldEmpty(value, field)) continue

    if (field.type === BlobFieldType.Drawing) {
      rows.push({ kind: "drawing", id: `field:${field.key}`, label: field.label, field, value })
      continue
    }
    if (field.type === BlobFieldType.Music) {
      rows.push({ kind: "music", id: `field:${field.key}`, label: field.label, field, value })
      continue
    }
    if (isBlobFieldType(field.type)) continue

    const text = formatCustomFieldValue(field, value)
    if (!text) continue
    rows.push({ kind: "text", id: `field:${field.key}`, label: field.label, text })
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
