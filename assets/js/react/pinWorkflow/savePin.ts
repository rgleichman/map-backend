import type { CatalogPinType, NewPin, PinType, UpdatePin } from "../types"
import { findPinType, schemaFields } from "../utils/customPinTypes"
import { validateCustomFields } from "../utils/customFieldValue"
import {
  pruneEmptyAdHocFields,
  stripAdHocBlobDrafts,
  validateAdHocFields,
} from "../utils/adHocFields"
import { stripBlobDraftsFromCustomData, type BlobFieldDraftEntry } from "../utils/blobFieldValue"
import {
  canWriteScheduleFromCatalog,
  isTimeOnlySchedule,
  scheduleCapabilities,
  skipScheduleTimeValidation,
} from "../utils/scheduleCapabilities"
import { buildPinTimeFields } from "./buildPinPayload"
import type { DraftState, ModalState } from "./types"
import { linkedPinAddErrorMessage, MAX_EXPLICIT_LINKED_PINS } from "../utils/linkedPinValidation"

export type SavePinValidationError =
  | { kind: "time"; message: string }
  | { kind: "form"; message: string }

/** Blob payloads uploaded after the pin exists, keyed by field key / ad-hoc field id. */
export type SavePinBlobDrafts = {
  blobDrafts: Record<string, BlobFieldDraftEntry>
  adHocBlobDrafts: Record<string, BlobFieldDraftEntry>
}

export type SavePinAddPayload = { mode: "add"; payload: NewPin } & SavePinBlobDrafts
export type SavePinEditPayload = {
  mode: "edit"
  pinId: number
  changes: UpdatePin
} & SavePinBlobDrafts

export type SavePinResult = SavePinAddPayload | SavePinEditPayload

export function validateAndBuildSavePayload(
  modal: NonNullable<Extract<ModalState, { mode: "add" } | { mode: "edit" }>>,
  draft: DraftState,
  showPromoteToWorld: boolean,
  catalog: CatalogPinType[] = []
): SavePinResult | SavePinValidationError {
  const { addLocation, editLocation, pinType, title, description, tags, customData, adHocFields, startTime, endTime, scheduleRrule, open24_7, visibleOnWorldMap, linkedPinIds } = draft
  const effectiveType: PinType = modal.mode === "add" ? (pinType ?? "") : modal.pin.pin_type
  const catalogType = findPinType(effectiveType, catalog)
  const caps = scheduleCapabilities(effectiveType, catalog)
  const isTimeOnly = isTimeOnlySchedule(caps)
  const skipTimeValidation = skipScheduleTimeValidation(caps, open24_7)
  const writeSchedule = canWriteScheduleFromCatalog(effectiveType, catalog)
  const timeFields = writeSchedule
    ? buildPinTimeFields(
      effectiveType,
      open24_7,
      startTime,
      endTime,
      scheduleRrule,
      catalog
    )
    : {}

  const fieldError = validateCustomFields(schemaFields(catalogType), customData)
  if (fieldError) return { kind: "form", message: fieldError }

  const adHocError = validateAdHocFields(adHocFields)
  if (adHocError) return { kind: "form", message: adHocError }

  if (!skipTimeValidation && isTimeOnly) {
    if (startTime && endTime && endTime <= startTime) {
      return { kind: "time", message: "End time must be after start time." }
    }
  } else if (!skipTimeValidation) {
    const start = startTime ? new Date(startTime) : undefined
    const end = endTime ? new Date(endTime) : undefined
    const now = new Date()
    if (start && end) {
      if (end <= start) {
        return { kind: "time", message: "End time must be after start time." }
      }
      if (end < now) {
        return { kind: "time", message: "End time cannot be in the past." }
      }
    }
  }

  if (linkedPinIds.length > MAX_EXPLICIT_LINKED_PINS) {
    return { kind: "form", message: linkedPinAddErrorMessage("max_links") }
  }

  if (modal.mode === "edit" && linkedPinIds.includes(modal.pin.id)) {
    return { kind: "form", message: linkedPinAddErrorMessage("self") }
  }

  const { cleaned: cleanedCustomData, drafts: blobDrafts } = stripBlobDraftsFromCustomData(
    customData,
    schemaFields(catalogType)
  )
  const { cleaned: cleanedAdHocFields, drafts: adHocBlobDrafts } = stripAdHocBlobDrafts(
    pruneEmptyAdHocFields(adHocFields)
  )

  if (modal.mode === "add") {
    const loc = addLocation ?? { lat: modal.lat, lng: modal.lng }
    if (!pinType) {
      return { kind: "form", message: "Please select a pin type" }
    }
    const payload: NewPin = {
      title,
      pin_type: pinType,
      description,
      latitude: loc.lat,
      longitude: loc.lng,
      tags,
      linked_pin_ids: linkedPinIds,
      ...timeFields,
      custom_data: cleanedCustomData,
      ad_hoc_fields: cleanedAdHocFields,
      ...(showPromoteToWorld ? { visible_on_world_map: visibleOnWorldMap } : {}),
    }
    return { mode: "add", payload, blobDrafts, adHocBlobDrafts }
  }

  const lat = editLocation?.lat ?? modal.pin.latitude
  const lng = editLocation?.lng ?? modal.pin.longitude
  const changes: UpdatePin = {
    title,
    description,
    tags,
    linked_pin_ids: linkedPinIds,
    ...timeFields,
    custom_data: cleanedCustomData,
    ad_hoc_fields: cleanedAdHocFields,
    latitude: lat,
    longitude: lng,
    ...(showPromoteToWorld ? { visible_on_world_map: visibleOnWorldMap } : {}),
  }
  return { mode: "edit", pinId: modal.pin.id, changes, blobDrafts, adHocBlobDrafts }
}
