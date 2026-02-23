import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { filterPins, isTodayRecurrenceDay } from "./filters"
import type { Pin } from "../../types"
import * as datetime from "../../utils/datetime"

vi.mock("../../utils/datetime", async (importOriginal) => {
  const actual = await importOriginal<typeof datetime>()
  return { ...actual, getNowInTimezone: vi.fn() }
})

const NOW_PARTS = {
  year: 2025,
  month: 2,
  day: 7,
  hour: 10,
  minute: 0,
}

function minimalPin(overrides: Partial<Pin>): Pin {
  return {
    id: 1,
    title: "",
    latitude: 0,
    longitude: 0,
    pin_type: "one_time",
    tags: [],
    ...overrides,
  }
}

/**
 * Weekday for recurrence is derived from the calendar date (year, month, day)
 * in a timezone-independent way, so it matches "today" in the pin's TZ regardless of host TZ.
 */
describe("isTodayRecurrenceDay", () => {
  beforeEach(() => {
    vi.mocked(datetime.getNowInTimezone).mockReturnValue(NOW_PARTS)
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

describe("filterPins with time 'now' (open now or within 2h)", () => {
  const tz = "UTC"
  const baseDate = "2025-02-07"

  beforeEach(() => {
    vi.mocked(datetime.getNowInTimezone).mockReturnValue(NOW_PARTS)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("one-time: opens in 1h is included", () => {
    const pin = minimalPin({
      pin_type: "one_time",
      schedule_timezone: tz,
      start_time: `${baseDate}T11:00:00`,
      end_time: `${baseDate}T12:00:00`,
    })
    const result = filterPins([pin], { tag: null, time: "now" })
    expect(result).toHaveLength(1)
  })

  it("one-time: opens in 2.5h is excluded", () => {
    const pin = minimalPin({
      pin_type: "one_time",
      schedule_timezone: tz,
      start_time: `${baseDate}T12:30:00`,
      end_time: `${baseDate}T13:00:00`,
    })
    const result = filterPins([pin], { tag: null, time: "now" })
    expect(result).toHaveLength(0)
  })

  it("one-time: open now is included", () => {
    const pin = minimalPin({
      pin_type: "one_time",
      schedule_timezone: tz,
      start_time: `${baseDate}T09:00:00`,
      end_time: `${baseDate}T11:00:00`,
    })
    const result = filterPins([pin], { tag: null, time: "now" })
    expect(result).toHaveLength(1)
  })

  it("one-time: already closed is excluded", () => {
    const pin = minimalPin({
      pin_type: "one_time",
      schedule_timezone: tz,
      start_time: `${baseDate}T08:00:00`,
      end_time: `${baseDate}T09:00:00`,
    })
    const result = filterPins([pin], { tag: null, time: "now" })
    expect(result).toHaveLength(0)
  })

  it("one-time: now 23:00, event 01:00–02:00 next day (within 2h) is included", () => {
    vi.mocked(datetime.getNowInTimezone).mockReturnValue({
      ...NOW_PARTS,
      hour: 23,
      minute: 0,
    })
    const pin = minimalPin({
      pin_type: "one_time",
      schedule_timezone: tz,
      start_time: "2025-02-08T01:00:00",
      end_time: "2025-02-08T02:00:00",
    })
    const result = filterPins([pin], { tag: null, time: "now" })
    expect(result).toHaveLength(1)
  })

  it("recurring: opens in 1h is included", () => {
    const pin = minimalPin({
      pin_type: "scheduled",
      schedule_timezone: tz,
      schedule_rrule: "FREQ=WEEKLY;BYDAY=FR",
      start_time: "2000-01-01T11:00:00",
      end_time: "2000-01-01T12:00:00",
    })
    const result = filterPins([pin], { tag: null, time: "now" })
    expect(result).toHaveLength(1)
  })

  it("recurring: opens in 3h is excluded", () => {
    const pin = minimalPin({
      pin_type: "scheduled",
      schedule_timezone: tz,
      schedule_rrule: "FREQ=WEEKLY;BYDAY=FR",
      start_time: "2000-01-01T13:00:00",
      end_time: "2000-01-01T14:00:00",
    })
    const result = filterPins([pin], { tag: null, time: "now" })
    expect(result).toHaveLength(0)
  })

  it("recurring: now 23:00, opens at 01:00 (next day, within 2h) is included", () => {
    vi.mocked(datetime.getNowInTimezone).mockReturnValue({
      ...NOW_PARTS,
      hour: 23,
      minute: 0,
    })
    const pin = minimalPin({
      pin_type: "scheduled",
      schedule_timezone: tz,
      schedule_rrule: "FREQ=WEEKLY;BYDAY=FR",
      start_time: "2000-01-01T01:00:00",
      end_time: "2000-01-01T02:00:00",
    })
    const result = filterPins([pin], { tag: null, time: "now" })
    expect(result).toHaveLength(1)
  })

  it("recurring: now 23:00, opens at 03:00 (next day, outside 2h) is excluded", () => {
    vi.mocked(datetime.getNowInTimezone).mockReturnValue({
      ...NOW_PARTS,
      hour: 23,
      minute: 0,
    })
    const pin = minimalPin({
      pin_type: "scheduled",
      schedule_timezone: tz,
      schedule_rrule: "FREQ=WEEKLY;BYDAY=FR",
      start_time: "2000-01-01T03:00:00",
      end_time: "2000-01-01T04:00:00",
    })
    const result = filterPins([pin], { tag: null, time: "now" })
    expect(result).toHaveLength(0)
  })

  it("recurring: Mon 23:00, open Tue 00:10 (next weekday within 2h) is included", () => {
    vi.mocked(datetime.getNowInTimezone).mockReturnValue({
      year: 2025,
      month: 2,
      day: 3,
      hour: 23,
      minute: 0,
    })
    const pin = minimalPin({
      pin_type: "scheduled",
      schedule_timezone: tz,
      schedule_rrule: "FREQ=WEEKLY;BYDAY=TU",
      start_time: "2000-01-01T00:10:00",
      end_time: "2000-01-01T01:00:00",
    })
    const result = filterPins([pin], { tag: null, time: "now" })
    expect(result).toHaveLength(1)
  })
})
