import { describe, expect, it } from "vitest"
import type { Pin } from "../types"
import {
  formatPinScheduleSummary,
  listTimedPinsInView,
  pinHasScheduleFields,
  pinInMapBounds,
  pinOneShotScheduleEndedInPast,
  type MapBounds,
} from "./pinScheduleSummary"

function minimalPin(overrides: Partial<Pin>): Pin {
  return {
    id: 1,
    title: "Pin",
    latitude: 0,
    longitude: 0,
    pin_type: "event",
    pin_type_id: 1,
    status: "approved",
    tags: [],
    ...overrides,
  }
}

describe("pinHasScheduleFields", () => {
  it("is false when all schedule columns are empty", () => {
    expect(pinHasScheduleFields(minimalPin({}))).toBe(false)
    expect(
      pinHasScheduleFields({ start_time: null, end_time: null, schedule_rrule: null }),
    ).toBe(false)
  })

  it("is true when any schedule column is set", () => {
    expect(pinHasScheduleFields(minimalPin({ start_time: "2026-06-01T10:00:00Z" }))).toBe(true)
    expect(pinHasScheduleFields(minimalPin({ end_time: "2026-06-01T12:00:00Z" }))).toBe(true)
    expect(pinHasScheduleFields(minimalPin({ schedule_rrule: "FREQ=WEEKLY;BYDAY=MO" }))).toBe(true)
  })
})

describe("formatPinScheduleSummary", () => {
  it("formats start and end range", () => {
    const summary = formatPinScheduleSummary({
      start_time: "2026-06-01T15:00:00Z",
      end_time: "2026-06-01T17:00:00Z",
    })
    expect(summary).toContain("–")
    expect(summary.length).toBeGreaterThan(0)
  })

  it("shows the date once when start and end are the same local day", () => {
    const start = "2026-06-01T15:00:00"
    const end = "2026-06-01T17:00:00"
    const summary = formatPinScheduleSummary({ start_time: start, end_time: end })
    const dateStr = new Date(start).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    expect(summary.split(dateStr).length - 1).toBe(1)
    expect(summary).toContain("–")
  })

  it("shows both dates when start and end span days", () => {
    const start = "2026-06-01T15:00:00"
    const end = "2026-06-02T17:00:00"
    const summary = formatPinScheduleSummary({ start_time: start, end_time: end })
    const startDate = new Date(start).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    const endDate = new Date(end).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    expect(summary).toContain(startDate)
    expect(summary).toContain(endDate)
  })

  it("formats start-only and end-only", () => {
    expect(formatPinScheduleSummary({ start_time: "2026-06-01T15:00:00Z" }).length).toBeGreaterThan(0)
    expect(formatPinScheduleSummary({ end_time: "2026-06-01T17:00:00Z" }).length).toBeGreaterThan(0)
  })

  it("formats rrule and combines with times", () => {
    const rruleOnly = formatPinScheduleSummary({
      schedule_rrule: "FREQ=WEEKLY;BYDAY=MO",
    })
    expect(rruleOnly.toLowerCase()).toMatch(/week|monday|mo/)

    const combined = formatPinScheduleSummary({
      start_time: "2000-01-01T09:00:00",
      end_time: "2000-01-01T17:00:00",
      schedule_rrule: "FREQ=WEEKLY;BYDAY=MO",
    })
    expect(combined).toContain("·")
  })

  it("returns empty string with no schedule fields", () => {
    expect(formatPinScheduleSummary({})).toBe("")
  })
})

describe("pinInMapBounds", () => {
  const normal: MapBounds = { west: -10, south: 0, east: 10, north: 20 }

  it("includes points inside normal bounds", () => {
    expect(pinInMapBounds(10, 0, normal)).toBe(true)
    expect(pinInMapBounds(-1, -11, normal)).toBe(false)
    expect(pinInMapBounds(21, 0, normal)).toBe(false)
  })

  it("handles antimeridian wrap when west > east", () => {
    const wrap: MapBounds = { west: 170, south: -10, east: -170, north: 10 }
    expect(pinInMapBounds(0, 175, wrap)).toBe(true)
    expect(pinInMapBounds(0, -175, wrap)).toBe(true)
    expect(pinInMapBounds(0, 0, wrap)).toBe(false)
  })
})

describe("pinOneShotScheduleEndedInPast", () => {
  const now = new Date("2026-06-15T12:00:00")

  it("is false for recurring schedules even when end is in the past", () => {
    expect(
      pinOneShotScheduleEndedInPast(
        {
          end_time: "2020-01-01T17:00:00",
          schedule_rrule: "FREQ=WEEKLY;BYDAY=MO",
        },
        now,
      ),
    ).toBe(false)
  })

  it("is true when absolute end is at or before now", () => {
    expect(
      pinOneShotScheduleEndedInPast(
        { end_time: "2026-06-15T11:00:00", schedule_rrule: null },
        now,
      ),
    ).toBe(true)
    expect(
      pinOneShotScheduleEndedInPast(
        { end_time: "2026-06-15T12:00:00", schedule_rrule: null },
        now,
      ),
    ).toBe(true)
  })

  it("is false without end, sentinel end, or future end", () => {
    expect(pinOneShotScheduleEndedInPast({ end_time: null }, now)).toBe(false)
    expect(
      pinOneShotScheduleEndedInPast({ end_time: "2000-01-01T17:00:00" }, now),
    ).toBe(false)
    expect(
      pinOneShotScheduleEndedInPast({ end_time: "2026-06-16T10:00:00" }, now),
    ).toBe(false)
  })
})

describe("listTimedPinsInView", () => {
  const bounds: MapBounds = { west: -1, south: -1, east: 1, north: 1 }
  const now = new Date("2026-06-15T12:00:00")

  it("returns empty when bounds are null", () => {
    expect(listTimedPinsInView([minimalPin({ start_time: "2026-01-01T00:00:00Z" })], null)).toEqual(
      [],
    )
  })

  it("excludes one-shot pins whose end is in the past", () => {
    const ended = minimalPin({
      id: 9,
      latitude: 0,
      longitude: 0,
      start_time: "2026-06-01T10:00:00",
      end_time: "2026-06-01T12:00:00",
    })
    const upcoming = minimalPin({
      id: 10,
      latitude: 0,
      longitude: 0,
      start_time: "2026-06-20T10:00:00",
      end_time: "2026-06-20T12:00:00",
    })
    expect(listTimedPinsInView([ended, upcoming], bounds, now).map((p) => p.id)).toEqual([10])
  })

  it("filters to timed pins in bounds and sorts by start_time", () => {
    const later = minimalPin({
      id: 2,
      title: "Later",
      latitude: 0,
      longitude: 0,
      start_time: "2026-06-02T10:00:00Z",
    })
    const earlier = minimalPin({
      id: 1,
      title: "Earlier",
      latitude: 0,
      longitude: 0,
      start_time: "2026-06-01T10:00:00Z",
    })
    const outOfView = minimalPin({
      id: 3,
      title: "Far",
      latitude: 50,
      longitude: 50,
      start_time: "2026-05-01T10:00:00Z",
    })
    const untimed = minimalPin({ id: 4, title: "No time", latitude: 0, longitude: 0 })
    const noStart = minimalPin({
      id: 5,
      title: "Rrule only",
      latitude: 0,
      longitude: 0,
      schedule_rrule: "FREQ=DAILY",
    })

    const result = listTimedPinsInView(
      [later, earlier, outOfView, untimed, noStart],
      bounds,
      now,
    )
    expect(result.map((p) => p.id)).toEqual([1, 2, 5])
  })
})
