import type {
  CustomPinTimeMode as CustomPinTimeModeName,
  CustomPinType,
  PinType,
} from "../types"
import { BuiltinPinType, isCustomPinType } from "./builtinPinType"
import { findCustomPinType } from "./customPinTypes"

/** Schedule kind for pin form / validation / open-now filtering. */
export type ScheduleKind = "none" | "one_time" | "recurring"

export type ScheduleCapabilities = {
  kind: ScheduleKind
  allowOpen247: boolean
}

export const CustomPinTimeMode = {
  None: "none",
  OneTime: "one_time",
  Hours: "hours",
} as const satisfies Record<string, CustomPinTimeModeName>

const NONE: ScheduleCapabilities = { kind: "none", allowOpen247: false }
const ONE_TIME: ScheduleCapabilities = { kind: "one_time", allowOpen247: false }
const RECURRING: ScheduleCapabilities = { kind: "recurring", allowOpen247: false }
const HOURS: ScheduleCapabilities = { kind: "recurring", allowOpen247: true }

/**
 * Resolve schedule UI/save behavior for any pin type.
 * Does not map builtins onto the custom `time_mode` enum.
 */
export function scheduleCapabilities(
  pinType: PinType | string | null | undefined,
  catalog: CustomPinType[] = []
): ScheduleCapabilities {
  if (!pinType) return NONE

  if (pinType === BuiltinPinType.Other) return NONE
  if (pinType === BuiltinPinType.OneTime) return ONE_TIME
  if (pinType === BuiltinPinType.Scheduled) return RECURRING
  if (pinType === BuiltinPinType.FoodBank) return HOURS

  if (isCustomPinType(pinType)) {
    const custom = findCustomPinType(pinType, catalog)
    if (!custom) return NONE
    switch (custom.time_mode ?? CustomPinTimeMode.None) {
      case CustomPinTimeMode.OneTime:
        return ONE_TIME
      case CustomPinTimeMode.Hours:
        return HOURS
      default:
        return NONE
    }
  }

  return NONE
}

export function isTimeOnlySchedule(caps: ScheduleCapabilities): boolean {
  return caps.kind === "recurring"
}

export function skipScheduleTimeValidation(
  caps: ScheduleCapabilities,
  open24_7: boolean
): boolean {
  return caps.kind === "none" || (caps.allowOpen247 && open24_7)
}

export function showScheduleTimeFields(
  caps: ScheduleCapabilities,
  open24_7: boolean
): boolean {
  return caps.kind !== "none" && !(caps.allowOpen247 && open24_7)
}

/**
 * Whether the client catalog is reliable enough to write schedule columns.
 * Unknown custom types (or catalog entries missing `time_mode`) must not
 * emit nulls that would wipe server schedule on edit.
 */
export function canWriteScheduleFromCatalog(
  pinType: PinType | string | null | undefined,
  catalog: CustomPinType[] = []
): boolean {
  if (!pinType || !isCustomPinType(pinType)) return true
  const custom = findCustomPinType(pinType, catalog)
  return custom != null && custom.time_mode != null
}

/**
 * Open-now datetime window: prefer catalog `one_time`, else fall back to
 * absolute start/end when there is no RRULE (covers missing catalog / stale
 * schedule after time_mode changes).
 */
export function usesOpenNowDatetimeWindow(
  pin: { pin_type: PinType | string; start_time?: string | null; end_time?: string | null; schedule_rrule?: string | null },
  catalog: CustomPinType[] = []
): boolean {
  const caps = scheduleCapabilities(pin.pin_type, catalog)
  if (caps.kind === "one_time") return true
  if (caps.kind !== "none") return false
  if (pin.schedule_rrule?.trim()) return false
  return !!(pin.start_time || pin.end_time)
}
