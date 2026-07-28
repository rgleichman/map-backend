import type { CatalogPinType, PinTimeMode as PinTimeModeName, PinType } from "../types"
import { findPinType } from "./customPinTypes"

/** Schedule kind for pin form / validation / open-now filtering. */
export type ScheduleKind = "none" | "one_time" | "recurring"

export type ScheduleCapabilities = {
  kind: ScheduleKind
  allowOpen247: boolean
}

export const PinTimeMode = {
  None: "none",
  OneTime: "one_time",
  Hours: "hours",
} as const satisfies Record<string, PinTimeModeName>

const NONE: ScheduleCapabilities = { kind: "none", allowOpen247: false }
const ONE_TIME: ScheduleCapabilities = { kind: "one_time", allowOpen247: false }

/**
 * Resolve schedule UI/save behavior from the catalog row only
 * (`time_mode` plus `allow_open_24_7`). Unknown types have no schedule.
 */
export function scheduleCapabilities(
  pinType: PinType | null | undefined,
  catalog: CatalogPinType[] = []
): ScheduleCapabilities {
  const catalogType = findPinType(pinType, catalog)
  if (!catalogType) return NONE

  switch (catalogType.time_mode ?? PinTimeMode.None) {
    case PinTimeMode.OneTime:
      return ONE_TIME
    case PinTimeMode.Hours:
      return { kind: "recurring", allowOpen247: catalogType.allow_open_24_7 === true }
    default:
      return NONE
  }
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
 * Unknown types (or catalog entries missing `time_mode`) must not emit nulls
 * that would wipe server schedule on edit.
 */
export function canWriteScheduleFromCatalog(
  pinType: PinType | null | undefined,
  catalog: CatalogPinType[] = []
): boolean {
  const catalogType = findPinType(pinType, catalog)
  return catalogType != null && catalogType.time_mode != null
}

/**
 * Open-now datetime window: prefer catalog `one_time`, else fall back to
 * absolute start/end when there is no RRULE (covers missing catalog / stale
 * schedule after time_mode changes).
 */
export function usesOpenNowDatetimeWindow(
  pin: {
    pin_type: PinType
    start_time?: string | null
    end_time?: string | null
    schedule_rrule?: string | null
  },
  catalog: CatalogPinType[] = []
): boolean {
  const caps = scheduleCapabilities(pin.pin_type, catalog)
  if (caps.kind === "one_time") return true
  if (caps.kind !== "none") return false
  if (pin.schedule_rrule?.trim()) return false
  return !!(pin.start_time || pin.end_time)
}
