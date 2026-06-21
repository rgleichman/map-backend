import type { CustomPinType, NewPin, PinType, UpdatePin } from "../types"
import {
  DEFAULT_BUILTIN_PIN_TYPE,
  isTimeOnlyBuiltinPinType,
  skipBuiltinTimeValidation,
} from "../utils/builtinPinType"
import { findCustomPinType, isCustomPinType } from "../utils/customPinTypes"
import { validateCustomFields } from "../components/CustomPinFields"
import { stripBlobDraftsFromCustomData, type BlobFieldDraftEntry } from "../utils/blobFieldValue"
import { buildPinTimeFields } from "./buildPinPayload"
import type { DraftState, ModalState } from "./types"

export type SavePinValidationError =
  | { kind: "time"; message: string }
  | { kind: "form"; message: string }

export type SavePinAddPayload = { mode: "add"; payload: NewPin; blobDrafts: Record<string, BlobFieldDraftEntry> }
export type SavePinEditPayload = { mode: "edit"; pinId: number; changes: UpdatePin; blobDrafts: Record<string, BlobFieldDraftEntry> }

export type SavePinResult = SavePinAddPayload | SavePinEditPayload

export function validateAndBuildSavePayload(
  modal: NonNullable<Extract<ModalState, { mode: "add" } | { mode: "edit" }>>,
  draft: DraftState,
  showPromoteToWorld: boolean,
  catalog: CustomPinType[] = []
): SavePinResult | SavePinValidationError {
  const { addLocation, editLocation, pinType, title, description, tags, customData, startTime, endTime, scheduleRrule, open24_7, visibleOnWorldMap } = draft
  const effectiveType: PinType = modal.mode === "add" ? (pinType ?? DEFAULT_BUILTIN_PIN_TYPE) : modal.pin.pin_type
  const isCustom = isCustomPinType(effectiveType)
  const isTimeOnly = isTimeOnlyBuiltinPinType(effectiveType)
  const skipTimeValidation = skipBuiltinTimeValidation(effectiveType, { isCustom, open24_7 })

  if (isCustom) {
    const customType = findCustomPinType(effectiveType, catalog)
    const fieldError = validateCustomFields(customType?.schema?.fields ?? [], customData)
    if (fieldError) return { kind: "form", message: fieldError }
  }

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

  if (modal.mode === "add") {
    const loc = addLocation ?? { lat: modal.lat, lng: modal.lng }
    if (!pinType) {
      return { kind: "form", message: "Please select a pin type" }
    }
    const customFields = isCustom ? findCustomPinType(effectiveType, catalog)?.schema?.fields ?? [] : []
    const { cleaned: cleanedCustomData, drafts: blobDrafts } = isCustom
      ? stripBlobDraftsFromCustomData(customData, customFields)
      : { cleaned: customData, drafts: {} as Record<string, BlobFieldDraftEntry> }
    const payload: NewPin = {
      title,
      pin_type: pinType,
      description,
      latitude: loc.lat,
      longitude: loc.lng,
      tags,
      ...(isCustom ? { custom_data: cleanedCustomData } : buildPinTimeFields(effectiveType, open24_7, startTime, endTime, scheduleRrule)),
      ...(showPromoteToWorld ? { visible_on_world_map: visibleOnWorldMap } : {}),
    }
    return { mode: "add", payload, blobDrafts }
  }

  const lat = editLocation?.lat ?? modal.pin.latitude
  const lng = editLocation?.lng ?? modal.pin.longitude
  const customFields = isCustom ? findCustomPinType(effectiveType, catalog)?.schema?.fields ?? [] : []
  const { cleaned: cleanedCustomData, drafts: blobDrafts } = isCustom
    ? stripBlobDraftsFromCustomData(customData, customFields)
    : { cleaned: customData, drafts: {} as Record<string, BlobFieldDraftEntry> }
  const changes: UpdatePin = {
    title,
    description,
    tags,
    ...(isCustom ? { custom_data: cleanedCustomData } : buildPinTimeFields(effectiveType, open24_7, startTime, endTime, scheduleRrule)),
    latitude: lat,
    longitude: lng,
    ...(showPromoteToWorld ? { visible_on_world_map: visibleOnWorldMap } : {}),
  }
  return { mode: "edit", pinId: modal.pin.id, changes, blobDrafts }
}
