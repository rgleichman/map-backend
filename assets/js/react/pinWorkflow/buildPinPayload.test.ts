import { describe, expect, it } from "vitest"
import { buildPinTimeFields } from "./buildPinPayload"

describe("buildPinTimeFields", () => {
  it("returns null times for other pin type", () => {
    expect(buildPinTimeFields("other", false, "10:00", "12:00", "")).toEqual({
      start_time: null,
      end_time: null,
      schedule_rrule: null,
    })
  })

  it("returns null times for food_bank when open 24/7", () => {
    expect(buildPinTimeFields("food_bank", true, "09:00", "17:00", "FREQ=DAILY")).toEqual({
      start_time: null,
      end_time: null,
      schedule_rrule: null,
    })
  })

  it("uses time-only ISO for scheduled pins", () => {
    expect(buildPinTimeFields("scheduled", false, "09:00", "17:00", "FREQ=WEEKLY;BYDAY=MO")).toEqual({
      start_time: "2000-01-01T09:00:00",
      end_time: "2000-01-01T17:00:00",
      schedule_rrule: "FREQ=WEEKLY;BYDAY=MO",
    })
  })

  it("uses datetime-local ISO for one_time pins", () => {
    expect(buildPinTimeFields("one_time", false, "2026-06-01T10:00", "2026-06-01T12:00", "")).toEqual({
      start_time: "2026-06-01T10:00:00",
      end_time: "2026-06-01T12:00:00",
      schedule_rrule: undefined,
    })
  })
})
