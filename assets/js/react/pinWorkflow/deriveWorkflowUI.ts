import type { PinType } from "../types"
import { DEFAULT_BUILTIN_PIN_TYPE } from "../utils/builtinPinType"
import type { DraftState, ModalState, Placement } from "./types"

export type WorkflowUIDerivation = {
  pendingLocation: { lat: number; lng: number } | null
  pendingPinType: PinType | null
  editingPinId: number | null
  showPlacementOverlay: boolean
  showEditForm: boolean
  showAddForm: boolean
  pinModalLat: number
  pinModalLng: number
  locationAlreadySetFromPlacement: boolean
}

type Params = {
  modal: ModalState
  placement: Placement | null
  draft: DraftState
  isDesktop: boolean
}

export function deriveWorkflowUI({ modal, placement, draft, isDesktop }: Params): WorkflowUIDerivation {
  const { addLocation, editLocation, pinType } = draft

  const pendingLocation = (() => {
    if (placement) return { lat: placement.lat, lng: placement.lng }
    if (modal?.mode === "select-type") return { lat: modal.lat, lng: modal.lng }
    if (modal?.mode === "add") return addLocation ?? { lat: modal.lat, lng: modal.lng }
    if (modal?.mode === "edit") return editLocation ?? { lat: modal.pin.latitude, lng: modal.pin.longitude }
    return null
  })()

  const pendingPinType: PinType | null =
    pendingLocation == null
      ? null
      : placement?.intent === "edit"
        ? placement.pin.pin_type
        : modal?.mode === "select-type"
          ? null
          : modal?.mode === "add"
            ? (pinType ?? DEFAULT_BUILTIN_PIN_TYPE)
            : modal?.mode === "edit"
              ? modal.pin.pin_type
              : DEFAULT_BUILTIN_PIN_TYPE

  const editingPinId = modal?.mode === "edit" ? modal.pin.id : null

  const showPlacementOverlay = placement !== null
  const showEditForm = modal?.mode === "edit" && !(placement?.intent === "edit")
  const showAddForm = modal?.mode === "add" && !(placement?.intent === "add")

  const pinModalLat =
    modal?.mode === "add"
      ? (addLocation?.lat ?? modal.lat)
      : modal?.mode === "edit"
        ? (editLocation?.lat ?? modal.pin.latitude)
        : 0
  const pinModalLng =
    modal?.mode === "add"
      ? (addLocation?.lng ?? modal.lng)
      : modal?.mode === "edit"
        ? (editLocation?.lng ?? modal.pin.longitude)
        : 0
  const locationAlreadySetFromPlacement = !isDesktop && modal?.mode === "add" && addLocation !== null

  return {
    pendingLocation,
    pendingPinType,
    editingPinId,
    showPlacementOverlay,
    showEditForm,
    showAddForm,
    pinModalLat,
    pinModalLng,
    locationAlreadySetFromPlacement,
  }
}
