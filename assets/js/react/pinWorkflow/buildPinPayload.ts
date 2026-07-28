import type { CatalogPinType, NewPin, PinType } from "../types"
import { localInputValueToISOString, timeOnlyToISOString } from "../utils/datetime"
import {
  isTimeOnlySchedule,
  scheduleCapabilities,
  skipScheduleTimeValidation,
} from "../utils/scheduleCapabilities"

export function buildPinTimeFields(
  effectiveType: PinType,
  open24_7: boolean,
  startTime: string,
  endTime: string,
  scheduleRrule: string,
  catalog: CatalogPinType[] = []
): Pick<NewPin, "start_time" | "end_time" | "schedule_rrule"> & {
  start_time?: string | null
  end_time?: string | null
  schedule_rrule?: string | null
} {
  const caps = scheduleCapabilities(effectiveType, catalog)
  if (caps.kind === "none") {
    return { start_time: null, end_time: null, schedule_rrule: null }
  }
  if (skipScheduleTimeValidation(caps, open24_7)) {
    return { start_time: null, end_time: null, schedule_rrule: null }
  }
  const isTimeOnly = isTimeOnlySchedule(caps)
  return {
    start_time: isTimeOnly ? timeOnlyToISOString(startTime) : localInputValueToISOString(startTime),
    end_time: isTimeOnly ? timeOnlyToISOString(endTime) : localInputValueToISOString(endTime),
    schedule_rrule: isTimeOnly ? (scheduleRrule || undefined) : undefined,
  }
}
