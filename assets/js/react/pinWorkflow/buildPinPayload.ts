import type { NewPin, PinType } from "../types"
import { localInputValueToISOString, timeOnlyToISOString } from "../utils/datetime"

export function buildPinTimeFields(
  effectiveType: PinType,
  open24_7: boolean,
  startTime: string,
  endTime: string,
  scheduleRrule: string
): Pick<NewPin, "start_time" | "end_time" | "schedule_rrule"> & {
  start_time?: string | null
  end_time?: string | null
  schedule_rrule?: string | null
} {
  if (effectiveType === "other") {
    return { start_time: null, end_time: null, schedule_rrule: null }
  }
  if (effectiveType === "food_bank" && open24_7) {
    return { start_time: null, end_time: null, schedule_rrule: null }
  }
  const isTimeOnly = effectiveType === "scheduled" || effectiveType === "food_bank"
  return {
    start_time: isTimeOnly ? timeOnlyToISOString(startTime) : localInputValueToISOString(startTime),
    end_time: isTimeOnly ? timeOnlyToISOString(endTime) : localInputValueToISOString(endTime),
    schedule_rrule: isTimeOnly ? (scheduleRrule || undefined) : undefined,
  }
}
