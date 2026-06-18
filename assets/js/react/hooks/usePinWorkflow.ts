import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"
import * as api from "../api/client"
import { initialPinWorkflowState, pinWorkflowReducer } from "../pinWorkflow/reducer"
import { validateAndBuildSavePayload } from "../pinWorkflow/savePin"
import { usePinTypes } from "../context/PinTypesContext"
import type { Pin, PinType, SubMap } from "../types"
import { canChooseWorldVisibility } from "../utils/subMapForm"
import type { ModalState, PinWorkflowAction, Placement } from "../pinWorkflow/types"

type Params = {
  userId?: number
  csrfToken?: string
  communityUrl?: string
  subMap: SubMap | null
  pins: Pin[]
  isDesktop: boolean
  updateOrAddPin: (pin: Pin) => void
  setPins: React.Dispatch<React.SetStateAction<Pin[]>>
  setApiError: (error: string | null) => void
}

export function usePinWorkflow({
  userId,
  csrfToken,
  communityUrl,
  subMap,
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
  const { catalog } = usePinTypes()

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

  const showPromoteToWorld = useMemo(() => canChooseWorldVisibility(subMap), [subMap])

  const onMapClick = useCallback((lng: number, lat: number) => {
    if (!userId) {
      dispatch({ type: "login_required" })
      return
    }
    if (subMap && subMap.can_post === false) {
      setApiError("You must join this community before adding pins.")
      return
    }
    if (modalRef.current?.mode === "add" || modalRef.current?.mode === "edit") return
    dispatch({ type: "begin_add_at", lat, lng })
  }, [userId, subMap, setApiError])

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
        updateOrAddPin(pinData)
        dispatch({ type: "after_add_saved" })
      } else {
        const { data } = await api.updatePin(csrfToken, result.pinId, result.changes)
        updateOrAddPin(data)
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

  const pendingLocation = useMemo(() => {
    if (placement) return { lat: placement.lat, lng: placement.lng }
    if (modal?.mode === "select-type") return { lat: modal.lat, lng: modal.lng }
    if (modal?.mode === "add") return addLocation ?? { lat: modal.lat, lng: modal.lng }
    if (modal?.mode === "edit") return editLocation ?? { lat: modal.pin.latitude, lng: modal.pin.longitude }
    return null
  }, [placement, modal, addLocation, editLocation])

  const pendingPinType: PinType | null =
    pendingLocation == null
      ? null
      : placement?.intent === "edit"
        ? placement.pin.pin_type
        : modal?.mode === "select-type"
          ? null
          : modal?.mode === "add"
            ? (pinType ?? "one_time")
            : modal?.mode === "edit"
              ? modal.pin.pin_type
              : "one_time"

  const editingPinId = modal?.mode === "edit" ? modal.pin.id : null

  const showPlacementOverlay = placement !== null
  const showEditForm = modal?.mode === "edit" && !(placement?.intent === "edit")
  const showAddForm = modal?.mode === "add" && !(placement?.intent === "add")

  const pinModalLat = modal?.mode === "add" ? (addLocation?.lat ?? modal.lat) : modal?.mode === "edit" ? (editLocation?.lat ?? modal.pin.latitude) : 0
  const pinModalLng = modal?.mode === "add" ? (addLocation?.lng ?? modal.lng) : modal?.mode === "edit" ? (editLocation?.lng ?? modal.pin.longitude) : 0
  const locationAlreadySetFromPlacement = !isDesktop && modal?.mode === "add" && addLocation !== null

  return {
    csrfToken,
    modal,
    placement,
    draft,
    timeError,
    formError,
    dispatch: dispatch as React.Dispatch<PinWorkflowAction>,
    saving,
    showPromoteToWorld,
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
