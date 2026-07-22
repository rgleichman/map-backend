import type { PinType } from "../types"
import { DEFAULT_BUILTIN_PIN_TYPE } from "../utils/builtinPinType"
import { isDesktopPanelMode, type DraftState, type ModalState, type Placement } from "./types"

export type WorkflowUIDerivation = {
  pendingLocation: { lat: number; lng: number } | null
  pendingPinType: PinType | null
  editingPinId: number | null
  /** Pin shown in the detail panel (view or edit); drives map focus / selection highlight. */
  detailPinId: number | null
  /** Desktop right-rail panel is visible (shifts map padding). */
  showDesktopPanel: boolean
  showPlacementOverlay: boolean
  showEditForm: boolean
  showAddForm: boolean
  showViewDetail: boolean
  pinModalLat: number
  pinModalLng: number
  locationAlreadySetFromPlacement: boolean
}

type Params = {
  modal: ModalState
  placement: Placement | null
  addLocation: DraftState["addLocation"]
  editLocation: DraftState["editLocation"]
  pinType: DraftState["pinType"]
  isDesktop: boolean
}

export function deriveWorkflowUI({
  modal,
  placement,
  addLocation,
  editLocation,
  pinType,
  isDesktop,
}: Params): WorkflowUIDerivation {
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
  const detailPinId =
    modal?.mode === "view" || modal?.mode === "edit" ? modal.pin.id : null

  const showDesktopPanel = isDesktop && placement == null && isDesktopPanelMode(modal)
  const showPlacementOverlay = placement !== null
  const showEditForm = modal?.mode === "edit" && !(placement?.intent === "edit")
  const showAddForm = modal?.mode === "add" && !(placement?.intent === "add")
  const showViewDetail = modal?.mode === "view"

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
    detailPinId,
    showDesktopPanel,
    showPlacementOverlay,
    showEditForm,
    showAddForm,
    showViewDetail,
    pinModalLat,
    pinModalLng,
    locationAlreadySetFromPlacement,
  }
}
