import { dateToLocalInputValue, isoToLocalInputValue, isoToTimeOnly } from "../utils/datetime"
import type { DraftState, PinWorkflowAction, PinWorkflowState } from "./types"

export const makeDefaultDraft = (): DraftState => {
  const now = new Date()
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000)
  return {
    pinType: null,
    title: "",
    description: "",
    tags: [],
    startTime: dateToLocalInputValue(now),
    endTime: dateToLocalInputValue(inOneHour),
    scheduleRrule: "",
    scheduleTimezone: "",
    open24_7: true,
    visibleOnWorldMap: false,
    addLocation: null,
    editLocation: null,
  }
}

export const initialPinWorkflowState: PinWorkflowState = {
  modal: null,
  placement: null,
  draft: makeDefaultDraft(),
  timeError: "",
}

export function pinWorkflowReducer(state: PinWorkflowState, action: PinWorkflowAction): PinWorkflowState {
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
        draft: {
          ...state.draft,
          pinType: action.pinType,
          ...(action.pinType === "food_bank"
            ? { open24_7: true }
            : action.pinType === "scheduled"
              ? { startTime: "09:00", endTime: "17:00" }
              : {}),
        },
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
          startTime: (action.pin.pin_type === "scheduled" || action.pin.pin_type === "food_bank")
            ? isoToTimeOnly(action.pin.start_time)
            : isoToLocalInputValue(action.pin.start_time),
          endTime: (action.pin.pin_type === "scheduled" || action.pin.pin_type === "food_bank")
            ? isoToTimeOnly(action.pin.end_time)
            : isoToLocalInputValue(action.pin.end_time),
          scheduleRrule: action.pin.schedule_rrule ?? "",
          scheduleTimezone: action.pin.schedule_timezone ?? "",
          open24_7: action.pin.pin_type === "food_bank"
            ? !(action.pin.start_time || action.pin.end_time || action.pin.schedule_rrule)
            : state.draft.open24_7,
          visibleOnWorldMap: action.pin.visible_on_world_map ?? false,
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
    case "set_schedule_rrule":
      return { ...state, draft: { ...state.draft, scheduleRrule: action.scheduleRrule } }
    case "set_schedule_timezone":
      return { ...state, draft: { ...state.draft, scheduleTimezone: action.scheduleTimezone } }
    case "set_open_24_7":
      return { ...state, draft: { ...state.draft, open24_7: action.open24_7 } }
    case "set_visible_on_world_map":
      return { ...state, draft: { ...state.draft, visibleOnWorldMap: action.visibleOnWorldMap } }
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
