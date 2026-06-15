import type { NewPin, PinType, UpdatePin } from "../types"
import { buildPinTimeFields } from "./buildPinPayload"
import type { DraftState, ModalState } from "./types"

export type SavePinValidationError = { timeError: string }

export type SavePinAddPayload = { mode: "add"; payload: NewPin }
export type SavePinEditPayload = { mode: "edit"; pinId: number; changes: UpdatePin }

export type SavePinResult = SavePinAddPayload | SavePinEditPayload

export function validateAndBuildSavePayload(
  modal: NonNullable<Extract<ModalState, { mode: "add" } | { mode: "edit" }>>,
  draft: DraftState,
  showPromoteToWorld: boolean
): SavePinResult | SavePinValidationError {
  const { addLocation, editLocation, pinType, title, description, tags, startTime, endTime, scheduleRrule, open24_7, visibleOnWorldMap } = draft
  const effectiveType: PinType = modal.mode === "add" ? (pinType ?? "one_time") : modal.pin.pin_type
  const isTimeOnly = effectiveType === "scheduled" || effectiveType === "food_bank"
  const skipTimeValidation =
    effectiveType === "other" || (effectiveType === "food_bank" && open24_7)

  if (!skipTimeValidation && isTimeOnly) {
    if (startTime && endTime && endTime <= startTime) {
      return { timeError: "End time must be after start time." }
    }
  } else if (!skipTimeValidation) {
    const start = startTime ? new Date(startTime) : undefined
    const end = endTime ? new Date(endTime) : undefined
    const now = new Date()
    if (start && end) {
      if (end <= start) {
        return { timeError: "End time must be after start time." }
      }
      if (end < now) {
        return { timeError: "End time cannot be in the past." }
      }
    }
  }

  if (modal.mode === "add") {
    const loc = addLocation ?? { lat: modal.lat, lng: modal.lng }
    if (!pinType) {
      return { timeError: "Please select a pin type" }
    }
    const payload: NewPin = {
      title,
      pin_type: pinType,
      description,
      latitude: loc.lat,
      longitude: loc.lng,
      tags,
      ...buildPinTimeFields(effectiveType, open24_7, startTime, endTime, scheduleRrule),
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
    ...buildPinTimeFields(effectiveType, open24_7, startTime, endTime, scheduleRrule),
    latitude: lat,
    longitude: lng,
    ...(showPromoteToWorld ? { visible_on_world_map: visibleOnWorldMap } : {}),
  }
  return { mode: "edit", pinId: modal.pin.id, changes }
}
