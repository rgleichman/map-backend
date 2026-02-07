import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { isTodayRecurrenceDay } from "./filters"
import * as datetime from "../../utils/datetime"

vi.mock("../../utils/datetime", async (importOriginal) => {
  const actual = await importOriginal<typeof datetime>()
  return { ...actual, getNowInTimezone: vi.fn() }
})

/**
 * Weekday for recurrence is derived from the calendar date (year, month, day)
 * in a timezone-independent way, so it matches "today" in the pin's TZ regardless of host TZ.
 */
describe("isTodayRecurrenceDay", () => {
  beforeEach(() => {
    vi.mocked(datetime.getNowInTimezone).mockReturnValue({
      year: 2025,
      month: 2,
      day: 7,
      hour: 10,
      minute: 0,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("uses weekday from calendar date (pin today Friday) so FR rule matches", () => {
    const rrule = "FREQ=WEEKLY;BYDAY=FR;BYHOUR=9;BYMINUTE=0"
    const result = isTodayRecurrenceDay(rrule, "Asia/Tokyo")
    expect(result).toBe(true)
  })
})
