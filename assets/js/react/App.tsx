import React, { useCallback, useEffect, useMemo, useReducer, useState } from "react"
import MapCanvas from "./components/MapCanvas"
import PinModal from "./components/PinModal"
import PinTypeModal from "./components/PinTypeModal"
import PinTypeLegend from "./components/PinTypeLegend"
import LoginRequiredModal from "./components/LoginRequiredModal"
import { useIsDesktop } from "./utils/useMediaQuery"
import type { NewPin, Pin, PinType, UpdatePin } from "./types"
import * as api from "./api/client"
import { dateToLocalInputValue, isoToLocalInputValue, localInputValueToISOString } from "./utils/datetime"
import { usePinChannelSync } from "./hooks/usePinChannelSync"
import "@stadiamaps/maplibre-search-box/dist/maplibre-search-box.css"

type Placement =
  | { intent: "add"; lat: number; lng: number }
  | { intent: "edit"; pin: Pin; lat: number; lng: number };

type Props = {
  userId?: number
  csrfToken?: string
  styleUrl?: string
}

const parseInitialPinId = () => {
  const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("pin")
  const n = p ? parseInt(p, 10) : NaN
  return Number.isInteger(n) ? n : null
}

type ModalState =
  | null
  | { mode: "select-type"; lng: number; lat: number }
  | { mode: "add"; lng: number; lat: number; pinType: PinType }
  | { mode: "edit"; pin: Pin }
  | { mode: "login-required" }

type DraftState = {
  pinType: PinType | null
  title: string
  description: string
  tags: string[]
  startTime: string
  endTime: string
  addLocation: { lat: number; lng: number } | null
  editLocation: { lat: number; lng: number } | null
}

type State = {
  modal: ModalState
  placement: Placement | null
  draft: DraftState
  timeError: string
}

type Action =
  | { type: "login_required" }
  | { type: "close_all" }
  | { type: "begin_add_at"; lat: number; lng: number }
  | { type: "after_add_saved" }
  | { type: "after_edit_saved" }
  | { type: "open_select_type"; lat: number; lng: number; resetDraft: boolean }
  | { type: "open_add"; lat: number; lng: number; pinType: PinType }
  | { type: "open_edit"; pin: Pin }
  | { type: "set_placement"; placement: Placement | null }
  | { type: "set_add_location"; lat: number; lng: number }
  | { type: "set_edit_location"; lat: number; lng: number }
  | { type: "set_pin_type"; pinType: PinType | null }
  | { type: "set_title"; title: string }
  | { type: "set_description"; description: string }
  | { type: "set_tags"; tags: string[] }
  | { type: "set_start_time"; startTime: string }
  | { type: "set_end_time"; endTime: string }
  | { type: "set_time_error"; timeError: string }
  | { type: "clear_time_error" }
  | { type: "clear_draft_locations" }

const makeDefaultDraft = (): DraftState => {
  const now = new Date()
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000)
  return {
    pinType: null,
    title: "",
    description: "",
    tags: [],
    startTime: dateToLocalInputValue(now),
    endTime: dateToLocalInputValue(inOneHour),
    addLocation: null,
    editLocation: null,
  }
}

const initialState: State = {
  modal: null,
  placement: null,
  draft: makeDefaultDraft(),
  timeError: "",
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "login_required":
      return { ...state, modal: { mode: "login-required" } }
    case "close_all":
      return { ...state, modal: null, placement: null, timeError: "" }
    case "begin_add_at": {
      const fresh = makeDefaultDraft()
      return {
        ...state,
        modal: null,
        placement: { intent: "add", lat: action.lat, lng: action.lng },
        timeError: "",
        draft: { ...fresh, addLocation: { lat: action.lat, lng: action.lng } },
      }
    }
    case "after_add_saved":
      return {
        ...state,
        modal: null,
        placement: null,
        timeError: "",
        draft: { ...state.draft, addLocation: null, pinType: null },
      }
    case "after_edit_saved":
      return {
        ...state,
        modal: null,
        placement: null,
        timeError: "",
        draft: { ...state.draft, editLocation: null },
      }
    case "open_select_type": {
      return {
        ...state,
        modal: { mode: "select-type", lat: action.lat, lng: action.lng },
        placement: null,
        timeError: "",
        draft: action.resetDraft ? makeDefaultDraft() : state.draft,
      }
    }
    case "open_add":
      return {
        ...state,
        modal: { mode: "add", lat: action.lat, lng: action.lng, pinType: action.pinType },
        placement: null,
        timeError: "",
        draft: { ...state.draft, pinType: action.pinType },
      }
    case "open_edit":
      return {
        ...state,
        modal: { mode: "edit", pin: action.pin },
        placement: null,
        timeError: "",
        draft: {
          ...state.draft,
          title: action.pin.title,
          description: action.pin.description || "",
          tags: action.pin.tags || [],
          startTime: isoToLocalInputValue(action.pin.start_time),
          endTime: isoToLocalInputValue(action.pin.end_time),
          editLocation: null,
        },
      }
    case "set_placement":
      return { ...state, placement: action.placement }
    case "set_add_location":
      return { ...state, draft: { ...state.draft, addLocation: { lat: action.lat, lng: action.lng } } }
    case "set_edit_location":
      return { ...state, draft: { ...state.draft, editLocation: { lat: action.lat, lng: action.lng } } }
    case "set_pin_type":
      return { ...state, draft: { ...state.draft, pinType: action.pinType } }
    case "set_title":
      return { ...state, draft: { ...state.draft, title: action.title } }
    case "set_description":
      return { ...state, draft: { ...state.draft, description: action.description } }
    case "set_tags":
      return { ...state, draft: { ...state.draft, tags: action.tags } }
    case "set_start_time":
      return { ...state, draft: { ...state.draft, startTime: action.startTime } }
    case "set_end_time":
      return { ...state, draft: { ...state.draft, endTime: action.endTime } }
    case "set_time_error":
      return { ...state, timeError: action.timeError }
    case "clear_time_error":
      return { ...state, timeError: "" }
    case "clear_draft_locations":
      return { ...state, draft: { ...state.draft, addLocation: null, editLocation: null } }
    default:
      return state
  }
}

export default function App({ userId, csrfToken, styleUrl = "/api/map/style" }: Props) {
  const isDesktop = useIsDesktop()
  const [initialPinId] = useState(parseInitialPinId)
  const [pins, setPins] = useState<Pin[]>([])
  const [loading, setLoading] = useState(true)
  const [state, dispatch] = useReducer(reducer, initialState)
  const { modal, placement, draft, timeError } = state
  const { addLocation, editLocation, pinType, title, description, tags, startTime, endTime } = draft

  useEffect(() => {
    api.getPins().then(({ data }) => {
      setPins(data)
    }).finally(() => setLoading(false))
  }, [])

  // Clear stale ?pin= from URL if pin not in list
  useEffect(() => {
    if (!loading && initialPinId !== null && !pins.some((p) => p.id === initialPinId)) {
      const path = window.location.pathname || "/map"
      window.history.replaceState(null, "", path)
    }
  }, [loading, initialPinId, pins])

  // Helper function to update or add a pin while preserving is_owner
  const updateOrAddPin = useCallback((pin: Pin) => {
    setPins(prevPins => {
      const existingIndex = prevPins.findIndex(p => p.id === pin.id)
      if (existingIndex >= 0) {
        // Preserve is_owner from existing pin to prevent regression where users can't edit pins they created
        const existing = prevPins[existingIndex]
        const updated = [...prevPins]
        updated[existingIndex] = { ...pin, is_owner: existing.is_owner ?? false }
        return updated
      }
      // New pin - broadcast doesn't include is_owner, so set it to false
      return [...prevPins, { ...pin, is_owner: false }]
    })
  }, [])

  usePinChannelSync({
    onUpsertPin: updateOrAddPin,
    onDeletePinId: (pinId) => setPins((prev) => prev.filter((p) => p.id !== pinId)),
  })

  const onMapClick = useCallback((lng: number, lat: number) => {
    if (!userId) {
      dispatch({ type: "login_required" })
      return
    }
    dispatch({ type: "begin_add_at", lat, lng })
  }, [userId])

  const onEdit = useCallback((pinId: number) => {
    const pin = pins.find(p => p.id === pinId)
    if (!pin) return
    dispatch({ type: "open_edit", pin })
  }, [pins])

  const onDelete = useCallback(async (pinId: number) => {
    const pin = pins.find(p => p.id === pinId)
    if (!pin) return
    if (!confirm("Are you sure you want to delete this pin?")) return
    await api.deletePin(csrfToken, pin.id)
    setPins((prev) => prev.filter((p) => p.id !== pin.id))
    dispatch({ type: "close_all" })
  }, [csrfToken, pins])

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


  const onLocationFromSearch = useCallback((lat: number, lng: number) => {
    if (modal?.mode === "add") {
      dispatch({ type: "set_add_location", lat, lng })
    } else if (modal?.mode === "edit") {
      dispatch({ type: "set_edit_location", lat, lng })
    }
  }, [modal])

  const onLocationFromGPS = useCallback((lat: number, lng: number) => {
    if (modal?.mode === "add") {
      dispatch({ type: "set_add_location", lat, lng })
    } else if (modal?.mode === "edit") {
      dispatch({ type: "set_edit_location", lat, lng })
    }
  }, [modal])

  const onSave = useCallback(async () => {
    if (!modal) return
    dispatch({ type: "clear_time_error" })
    const start = startTime ? new Date(startTime) : undefined
    const end = endTime ? new Date(endTime) : undefined
    const now = new Date()
    // Validation
    if (start && end) {
      if (end <= start) {
        dispatch({ type: "set_time_error", timeError: "End time must be after start time." })
        return
      }
      if (end < now) {
        dispatch({ type: "set_time_error", timeError: "End time cannot be in the past." })
        return
      }
    }
    if (modal.mode === "add") {
      const loc = addLocation ?? { lat: modal.lat, lng: modal.lng }
      if (!pinType) {
        dispatch({ type: "set_time_error", timeError: "Please select a pin type" })
        return
      }
      const payload: NewPin = {
        title,
        pin_type: pinType,
        description,
        latitude: loc.lat,
        longitude: loc.lng,
        tags,
        start_time: localInputValueToISOString(startTime),
        end_time: localInputValueToISOString(endTime)
      }
      const { data: pinData } = await api.createPin(csrfToken, payload)
      setPins((prev) => [...prev, pinData])
      dispatch({ type: "after_add_saved" })
    } else if (modal.mode === "edit") {
      const lat = editLocation?.lat ?? modal.pin.latitude
      const lng = editLocation?.lng ?? modal.pin.longitude
      const changes: UpdatePin = {
        title,
        description,
        tags,
        start_time: localInputValueToISOString(startTime),
        end_time: localInputValueToISOString(endTime),
        latitude: lat,
        longitude: lng
      }
      const { data } = await api.updatePin(csrfToken, modal.pin.id, changes)
      setPins((prev) => prev.map((p) => p.id === data.id ? { ...p, ...data } : p))
      dispatch({ type: "after_edit_saved" })
    }
  }, [modal, addLocation, editLocation, pinType, title, description, tags, startTime, endTime, csrfToken])

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

  const onPopupOpen = useCallback((pinId: number) => {
    const path = window.location.pathname || "/map"
    window.history.replaceState(null, "", `${path}?pin=${pinId}`)
  }, [])
  const onPopupClose = useCallback(() => {
    requestAnimationFrame(() => {
      if (document.querySelector(".maplibregl-popup") === null) {
        const path = window.location.pathname || "/map"
        window.history.replaceState(null, "", path)
      }
    })
  }, [])

  const pinModalLat = modal?.mode === "add" ? (addLocation?.lat ?? modal.lat) : modal?.mode === "edit" ? (editLocation?.lat ?? modal.pin.latitude) : 0
  const pinModalLng = modal?.mode === "add" ? (addLocation?.lng ?? modal.lng) : modal?.mode === "edit" ? (editLocation?.lng ?? modal.pin.longitude) : 0
  const locationAlreadySetFromPlacement = !isDesktop && modal?.mode === "add" && addLocation !== null

  return (
    <div className="w-full h-full">
      {!loading && (
        <>
          <MapCanvas
            styleUrl={styleUrl}
            pins={pins}
            initialPinId={initialPinId}
            onMapClick={onMapClick}
            onEdit={onEdit}
            onDelete={onDelete}
            pendingLocation={pendingLocation}
            pendingPinType={pendingPinType}
            editingPinId={editingPinId}
            onPlacementMapClick={placement ? onPlacementMapClick : undefined}
            onPopupOpen={onPopupOpen}
            onPopupClose={onPopupClose}
          />
          <PinTypeLegend />
        </>
      )}
      {modal?.mode === "login-required" && (
        <LoginRequiredModal onClose={() => dispatch({ type: "close_all" })} />
      )}

      {/* Desktop: side panel for type selection and add/edit form (hidden while picking location) */}
      {isDesktop && !placement && modal && (modal.mode === "select-type" || modal.mode === "add" || modal.mode === "edit") && (
        <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-base-100 border-l border-base-300 shadow-xl z-40 flex flex-col overflow-hidden">
          <div className="p-4 overflow-y-auto flex-1">
            {modal.mode === "select-type" && (
              <PinTypeModal
                layout="panel"
                onSelectType={onSelectPinType}
                onCancel={() => dispatch({ type: "close_all" })}
              />
            )}
            {(modal.mode === "add" || modal.mode === "edit") && (
              <PinModal
                layout="panel"
                title={title}
                setTitle={(t) => dispatch({ type: "set_title", title: t })}
                description={description}
                setDescription={(d) => dispatch({ type: "set_description", description: d })}
                tags={tags}
                setTags={(ts) => dispatch({ type: "set_tags", tags: ts })}
                startTime={startTime}
                setStartTime={(t) => dispatch({ type: "set_start_time", startTime: t })}
                endTime={endTime}
                setEndTime={(t) => dispatch({ type: "set_end_time", endTime: t })}
                latitude={pinModalLat}
                longitude={pinModalLng}
                onStartPickOnMap={onStartPickOnMap}
                onLocationFromSearch={onLocationFromSearch}
                onLocationFromGPS={onLocationFromGPS}
                mode={modal.mode}
                onCancel={() => dispatch({ type: "close_all" })}
                onSave={onSave}
                onDelete={modal.mode === "edit" ? () => onDelete(modal.pin.id) : undefined}
                canDelete={canDelete}
              />
            )}
          </div>
        </div>
      )}

      {/* Placement overlay (Create/Cancel or Confirm/Cancel) */}
      {showPlacementOverlay && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-base-100/95 border-t border-base-300 shadow-lg">
          <div className="mx-auto w-full max-w-md flex gap-2 justify-center">
            {placement.intent === "add" ? (
              modal?.mode === "add" ? (
                <>
                  <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: "set_placement", placement: null })}>Cancel</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      if (!placement || placement.intent !== "add") return
                      dispatch({ type: "set_add_location", lat: placement.lat, lng: placement.lng })
                      dispatch({ type: "set_placement", placement: null })
                    }}
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: "set_placement", placement: null })}>Cancel</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      if (!placement || placement.intent !== "add") return
                      dispatch({ type: "set_add_location", lat: placement.lat, lng: placement.lng })
                      dispatch({ type: "open_select_type", lat: placement.lat, lng: placement.lng, resetDraft: false })
                    }}
                  >
                    Create pin
                  </button>
                </>
              )
            ) : (
              <>
                <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: "set_placement", placement: null })}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (!placement || placement.intent !== "edit") return
                    dispatch({ type: "set_edit_location", lat: placement.lat, lng: placement.lng })
                    dispatch({ type: "set_placement", placement: null })
                  }}
                >
                  Confirm
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile: full modals for type selection and add/edit form (single PinModal block) */}
      {!isDesktop && modal?.mode === "select-type" && (
        <PinTypeModal
          layout="modal"
          onSelectType={onSelectPinType}
          onCancel={() => dispatch({ type: "close_all" })}
        />
      )}
      {!isDesktop && ((showAddForm && modal?.mode === "add") || (showEditForm && modal?.mode === "edit")) && (
        <PinModal
          layout="modal"
          locationAlreadySetFromPlacement={locationAlreadySetFromPlacement}
          title={title}
          setTitle={(t) => dispatch({ type: "set_title", title: t })}
          description={description}
          setDescription={(d) => dispatch({ type: "set_description", description: d })}
          tags={tags}
          setTags={(ts) => dispatch({ type: "set_tags", tags: ts })}
          startTime={startTime}
          setStartTime={(t) => dispatch({ type: "set_start_time", startTime: t })}
          endTime={endTime}
          setEndTime={(t) => dispatch({ type: "set_end_time", endTime: t })}
          latitude={pinModalLat}
          longitude={pinModalLng}
          onStartPickOnMap={onStartPickOnMap}
          onLocationFromSearch={onLocationFromSearch}
          onLocationFromGPS={onLocationFromGPS}
          mode={modal.mode}
          onCancel={() => dispatch({ type: "close_all" })}
          onSave={onSave}
          onDelete={modal.mode === "edit" ? () => onDelete(modal.pin.id) : undefined}
          canDelete={canDelete}
        />
      )}

      {timeError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="absolute bg-error text-error-content px-4 py-2 rounded shadow-lg pointer-events-auto" style={{ top: "10%" }}>⏰ {timeError}</div>
        </div>
      )}
    </div>
  )
}


