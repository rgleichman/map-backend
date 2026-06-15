import type { Pin, PinType } from "../types"

export type Placement =
  | { intent: "add"; lat: number; lng: number }
  | { intent: "edit"; pin: Pin; lat: number; lng: number }

export type ModalState =
  | null
  | { mode: "select-type"; lng: number; lat: number }
  | { mode: "add"; lng: number; lat: number; pinType: PinType }
  | { mode: "edit"; pin: Pin }
  | { mode: "login-required" }

export type DraftState = {
  pinType: PinType | null
  title: string
  description: string
  tags: string[]
  startTime: string
  endTime: string
  scheduleRrule: string
  scheduleTimezone: string
  open24_7: boolean
  visibleOnWorldMap: boolean
  addLocation: { lat: number; lng: number } | null
  editLocation: { lat: number; lng: number } | null
}

export type PinWorkflowState = {
  modal: ModalState
  placement: Placement | null
  draft: DraftState
  timeError: string
}

export type PinWorkflowAction =
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
  | { type: "set_schedule_rrule"; scheduleRrule: string }
  | { type: "set_schedule_timezone"; scheduleTimezone: string }
  | { type: "set_open_24_7"; open24_7: boolean }
  | { type: "set_visible_on_world_map"; visibleOnWorldMap: boolean }
  | { type: "set_time_error"; timeError: string }
  | { type: "clear_time_error" }
  | { type: "clear_draft_locations" }

export type PinDraftAction = Extract<
  PinWorkflowAction,
  | { type: "set_title" }
  | { type: "set_description" }
  | { type: "set_tags" }
  | { type: "set_start_time" }
  | { type: "set_end_time" }
  | { type: "set_schedule_rrule" }
  | { type: "set_schedule_timezone" }
  | { type: "set_open_24_7" }
  | { type: "set_visible_on_world_map" }
>
