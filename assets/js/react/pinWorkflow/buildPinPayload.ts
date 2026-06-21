import type { NewPin, PinType } from "../types"
import { BuiltinPinType, isTimeOnlyBuiltinPinType } from "../utils/builtinPinType"
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
  if (effectiveType === BuiltinPinType.Other) {
    return { start_time: null, end_time: null, schedule_rrule: null }
  }
  if (effectiveType === BuiltinPinType.FoodBank && open24_7) {
    return { start_time: null, end_time: null, schedule_rrule: null }
  }
  const isTimeOnly = isTimeOnlyBuiltinPinType(effectiveType)
  return {
    start_time: isTimeOnly ? timeOnlyToISOString(startTime) : localInputValueToISOString(startTime),
    end_time: isTimeOnly ? timeOnlyToISOString(endTime) : localInputValueToISOString(endTime),
    schedule_rrule: isTimeOnly ? (scheduleRrule || undefined) : undefined,
  }
}
