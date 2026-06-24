import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"
import * as api from "../api/client"
import { deriveWorkflowUI } from "../pinWorkflow/deriveWorkflowUI"
import { initialPinWorkflowState, pinWorkflowReducer } from "../pinWorkflow/reducer"
import { validateAndBuildSavePayload } from "../pinWorkflow/savePin"
import { uploadBlobDrafts } from "../pinWorkflow/uploadBlobDrafts"
import type { CustomPinType, Pin, PinType, SubMap } from "../types"
import type { ModalState, PinWorkflowAction, Placement } from "../pinWorkflow/types"

type Params = {
  userId?: number
  userMuted?: boolean
  csrfToken?: string
  communityUrl?: string
  subMap: SubMap | null
  catalog: CustomPinType[]
  showPromoteToWorld: boolean
  pins: Pin[]
  isDesktop: boolean
  updateOrAddPin: (pin: Pin) => void
  setPins: React.Dispatch<React.SetStateAction<Pin[]>>
  setApiError: (error: string | null) => void
}

export function usePinWorkflow({
  userId,
  userMuted = false,
  csrfToken,
  communityUrl,
  subMap,
  catalog,
  showPromoteToWorld,
  pins,
  isDesktop,
  updateOrAddPin,
  setPins,
  setApiError,
}: Params) {
  const [state, dispatch] = useReducer(pinWorkflowReducer, initialPinWorkflowState)
  const { modal, placement, draft, timeError, formError } = state
  const { addLocation, editLocation, pinType, title, description, tags, customData, startTime, endTime, scheduleRrule, scheduleTimezone, open24_7, visibleOnWorldMap } = draft
  const [saving, setSaving] = useState(false)

  const modalRef = useRef(modal)
  modalRef.current = modal
  const escapePanelRef = useRef({ modal, isDesktop, dispatch })
  escapePanelRef.current = { modal, isDesktop, dispatch }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      const { modal: m, isDesktop: desktop, dispatch: d } = escapePanelRef.current
      if (desktop && m?.mode === "select-type") {
        e.preventDefault()
        e.stopPropagation()
        d({ type: "close_all" })
      }
    }
    document.addEventListener("keydown", handleKey, true)
    return () => document.removeEventListener("keydown", handleKey, true)
  }, [])

  const onMapClick = useCallback((lng: number, lat: number) => {
    if (!userId) {
      dispatch({ type: "login_required" })
      return
    }
    if (userMuted) {
      setApiError("Your account is muted and cannot add or edit pins.")
      return
    }
    if (subMap && subMap.can_post === false) {
      setApiError("You must join this community before adding pins.")
      return
    }
    if (modalRef.current?.mode === "add" || modalRef.current?.mode === "edit") return
    dispatch({ type: "begin_add_at", lat, lng })
  }, [userId, userMuted, subMap, setApiError])

  const onEdit = useCallback((pinId: number) => {
    const pin = pins.find(p => p.id === pinId)
    if (!pin) return
    dispatch({ type: "open_edit", pin })
  }, [pins])

  const onDelete = useCallback(async (pinId: number) => {
    const pin = pins.find(p => p.id === pinId)
    if (!pin) return
    if (!confirm("Are you sure you want to delete this pin?")) return
    setApiError(null)
    setSaving(true)
    try {
      await api.deletePin(csrfToken, pin.id)
      setPins((prev) => prev.filter((p) => p.id !== pin.id))
      dispatch({ type: "close_all" })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed. Please try again."
      setApiError(message)
    } finally {
      setSaving(false)
    }
  }, [csrfToken, pins, setApiError, setPins])

  const onStartPickOnMap = useCallback(() => {
    if (modal?.mode === "edit") {
      dispatch({
        type: "set_placement",
        placement: {
          intent: "edit",
          pin: modal.pin,
          lat: editLocation?.lat ?? modal.pin.latitude,
          lng: editLocation?.lng ?? modal.pin.longitude
        }
      })
    } else if (modal?.mode === "add") {
      const lat = addLocation?.lat ?? modal.lat
      const lng = addLocation?.lng ?? modal.lng
      dispatch({ type: "set_placement", placement: { intent: "add", lat, lng } })
    }
  }, [modal, editLocation, addLocation])

  const onPlacementMapClick = useCallback(
    (lng: number, lat: number) => {
      dispatch({
        type: "set_placement",
        placement: placement ? { ...placement, lat, lng } : null
      })
    },
    [placement]
  )

  const onSelectPinType = useCallback((selectedType: PinType) => {
    if (modal?.mode !== "select-type") return
    dispatch({ type: "open_add", lat: modal.lat, lng: modal.lng, pinType: selectedType })
  }, [modal])

  const onSave = useCallback(async () => {
    if (!modal || (modal.mode !== "add" && modal.mode !== "edit")) return
    dispatch({ type: "clear_time_error" })
    dispatch({ type: "clear_form_error" })
    setApiError(null)

    const result = validateAndBuildSavePayload(modal, draft, showPromoteToWorld, catalog)
    if ("kind" in result) {
      if (result.kind === "time") dispatch({ type: "set_time_error", timeError: result.message })
      else dispatch({ type: "set_form_error", formError: result.message })
      return
    }

    setSaving(true)
    try {
      if (result.mode === "add") {
        const { data: pinData } = communityUrl
          ? await api.createSubMapPin(csrfToken, communityUrl, result.payload)
          : await api.createPin(csrfToken, result.payload)
        const pinWithBlobs =
          Object.keys(result.blobDrafts).length > 0
            ? await uploadBlobDrafts(csrfToken, pinData, result.blobDrafts)
            : pinData
        updateOrAddPin(pinWithBlobs)
        dispatch({ type: "after_add_saved" })
      } else {
        const { data } = await api.updatePin(csrfToken, result.pinId, result.changes)
        const pinWithBlobs =
          Object.keys(result.blobDrafts).length > 0
            ? await uploadBlobDrafts(csrfToken, data, result.blobDrafts)
            : data
        updateOrAddPin(pinWithBlobs)
        dispatch({ type: "after_edit_saved" })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed. Please try again."
      setApiError(message)
    } finally {
      setSaving(false)
    }
  }, [modal, draft, showPromoteToWorld, catalog, csrfToken, updateOrAddPin, communityUrl, setApiError])

  const canDelete = useMemo(() => modal && modal.mode === "edit" && modal.pin.is_owner, [modal]) as boolean | undefined

  const workflowUI = useMemo(
    () => deriveWorkflowUI({ modal, placement, addLocation, editLocation, pinType, isDesktop }),
    [modal, placement, addLocation, editLocation, pinType, isDesktop]
  )
  const {
    pendingLocation,
    pendingPinType,
    editingPinId,
    showPlacementOverlay,
    showEditForm,
    showAddForm,
    pinModalLat,
    pinModalLng,
    locationAlreadySetFromPlacement,
  } = workflowUI

  return {
    csrfToken,
    modal,
    placement,
    draft,
    timeError,
    formError,
    dispatch: dispatch as React.Dispatch<PinWorkflowAction>,
    saving,
    onMapClick,
    onEdit,
    onDelete,
    onStartPickOnMap,
    onPlacementMapClick,
    onSelectPinType,
    onSave,
    canDelete,
    pendingLocation,
    pendingPinType,
    editingPinId,
    showPlacementOverlay,
    showEditForm,
    showAddForm,
    pinModalLat,
    pinModalLng,
    locationAlreadySetFromPlacement,
    pinType,
    title,
    description,
    tags,
    startTime,
    endTime,
    scheduleRrule,
    scheduleTimezone,
    open24_7,
    visibleOnWorldMap,
    customData,
  }
}

export type PinWorkflow = ReturnType<typeof usePinWorkflow>
export type { ModalState, Placement, PinWorkflowAction }
