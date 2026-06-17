import type { CustomPinType, NewPin, PinType, UpdatePin } from "../types"
import { findCustomPinType, isCustomPinType } from "../utils/customPinTypes"
import { validateCustomFields } from "../components/CustomPinFields"
import { buildPinTimeFields } from "./buildPinPayload"
import type { DraftState, ModalState } from "./types"

export type SavePinValidationError =
  | { kind: "time"; message: string }
  | { kind: "form"; message: string }

export type SavePinAddPayload = { mode: "add"; payload: NewPin }
export type SavePinEditPayload = { mode: "edit"; pinId: number; changes: UpdatePin }

export type SavePinResult = SavePinAddPayload | SavePinEditPayload

export function validateAndBuildSavePayload(
  modal: NonNullable<Extract<ModalState, { mode: "add" } | { mode: "edit" }>>,
  draft: DraftState,
  showPromoteToWorld: boolean,
  catalog: CustomPinType[] = []
): SavePinResult | SavePinValidationError {
  const { addLocation, editLocation, pinType, title, description, tags, customData, startTime, endTime, scheduleRrule, open24_7, visibleOnWorldMap } = draft
  const effectiveType: PinType = modal.mode === "add" ? (pinType ?? "one_time") : modal.pin.pin_type
  const isCustom = isCustomPinType(effectiveType)
  const isTimeOnly = effectiveType === "scheduled" || effectiveType === "food_bank"
  const skipTimeValidation =
    effectiveType === "other" || isCustom || (effectiveType === "food_bank" && open24_7)

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
    const payload: NewPin = {
      title,
      pin_type: pinType,
      description,
      latitude: loc.lat,
      longitude: loc.lng,
      tags,
      ...(isCustom ? { custom_data: customData } : buildPinTimeFields(effectiveType, open24_7, startTime, endTime, scheduleRrule)),
      ...(showPromoteToWorld ? { visible_on_world_map: visibleOnWorldMap } : {}),
    }
    return { mode: "add", payload }
  }

  const lat = editLocation?.lat ?? modal.pin.latitude
  const lng = editLocation?.lng ?? modal.pin.longitude
  const changes: UpdatePin = {
    title,
    description,
    tags,
    ...(isCustom ? { custom_data: customData } : buildPinTimeFields(effectiveType, open24_7, startTime, endTime, scheduleRrule)),
    latitude: lat,
    longitude: lng,
    ...(showPromoteToWorld ? { visible_on_world_map: visibleOnWorldMap } : {}),
  }
  return { mode: "edit", pinId: modal.pin.id, changes }
}
