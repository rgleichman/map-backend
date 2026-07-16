import type { Pin, PinType } from "../types"

/**
 * When the user is picking a new location on the map, we enter a temporary
 * "placement" mode. This is separate from the modal state so we can show a
 * lightweight confirmation bar over the map.
 */
export type Placement =
  | { intent: "add"; lat: number; lng: number }
  | { intent: "edit"; pin: Pin; lat: number; lng: number }

export type ModalState =
  | null
  | { mode: "view"; pin: Pin }
  | { mode: "select-type"; lng: number; lat: number }
  | { mode: "add"; lng: number; lat: number; pinType: PinType }
  | { mode: "edit"; pin: Pin }
  | { mode: "login-required" }

export type DraftState = {
  pinType: PinType | null
  title: string
  description: string
  tags: string[]
  customData: Record<string, unknown>
  startTime: string
  endTime: string
  scheduleRrule: string
  scheduleTimezone: string
  open24_7: boolean
  visibleOnWorldMap: boolean
  linkedPinIds: number[]
  addLocation: { lat: number; lng: number } | null
  editLocation: { lat: number; lng: number } | null
}

/**
 * Full workflow state owned by the reducer.
 *
 * - `timeError`: errors specifically about time fields
 * - `formError`: non-time validation errors (e.g. required custom fields)
 */
export type PinWorkflowState = {
  modal: ModalState
  placement: Placement | null
  draft: DraftState
  timeError: string
  formError: string
}

export type PinWorkflowAction =
  | { type: "login_required" }
  | { type: "close_all" }
  | { type: "begin_add_at"; lat: number; lng: number }
  | { type: "after_add_saved" }
  | { type: "after_edit_saved"; pin: Pin }
  | { type: "open_view"; pin: Pin }
  | { type: "open_select_type"; lat: number; lng: number; resetDraft: boolean }
  | { type: "open_add"; lat: number; lng: number; pinType: PinType }
  | { type: "open_edit"; pin: Pin }
  | { type: "cancel_edit" }
  | { type: "set_placement"; placement: Placement | null }
  | { type: "set_add_location"; lat: number; lng: number }
  | { type: "set_edit_location"; lat: number; lng: number }
  | { type: "set_pin_type"; pinType: PinType | null }
  | { type: "set_title"; title: string }
  | { type: "set_description"; description: string }
  | { type: "set_tags"; tags: string[] }
  | { type: "set_start_time"; startTime: string }
  | { type: "set_end_time"; endTime: string }
  | { type: "set_schedule_rrule"; scheduleRrule: string }
  | { type: "set_schedule_timezone"; scheduleTimezone: string }
  | { type: "set_open_24_7"; open24_7: boolean }
  | { type: "set_visible_on_world_map"; visibleOnWorldMap: boolean }
  | { type: "set_custom_data"; customData: Record<string, unknown> }
  | { type: "add_linked_pin"; pinId: number }
  | { type: "remove_linked_pin"; pinId: number }
  | { type: "set_time_error"; timeError: string }
  | { type: "clear_time_error" }
  | { type: "set_form_error"; formError: string }
  | { type: "clear_form_error" }
  | { type: "clear_draft_locations" }
