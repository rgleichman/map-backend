import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  filterPins,
  isTodayRecurrenceDay,
  pinMapGeoJsonSyncPart,
  pinMatchesFilter,
  pinMatchesQuery,
  type FilterState,
} from "./filters"
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
    status: "approved",
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

describe("filterPins by pin type", () => {
  it("shows only the selected type", () => {
    const one = minimalPin({ id: 1, pin_type: "one_time" })
    const sched = minimalPin({ id: 2, pin_type: "scheduled" })
    const result = filterPins([one, sched], { tag: null, time: null, pinType: "scheduled", query: "", heartedOnly: false, mineOnly: false })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(2)
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
    const result = filterPins([pin], { tag: null, time: "now", pinType: null, query: "", heartedOnly: false, mineOnly: false })
    expect(result).toHaveLength(1)
  })

  it("one-time: opens in 2.5h is excluded", () => {
    const pin = minimalPin({
      pin_type: "one_time",
      schedule_timezone: tz,
      start_time: `${baseDate}T12:30:00`,
      end_time: `${baseDate}T13:00:00`,
    })
    const result = filterPins([pin], { tag: null, time: "now", pinType: null, query: "", heartedOnly: false, mineOnly: false })
    expect(result).toHaveLength(0)
  })

  it("one-time: open now is included", () => {
    const pin = minimalPin({
      pin_type: "one_time",
      schedule_timezone: tz,
      start_time: `${baseDate}T09:00:00`,
      end_time: `${baseDate}T11:00:00`,
    })
    const result = filterPins([pin], { tag: null, time: "now", pinType: null, query: "", heartedOnly: false, mineOnly: false })
    expect(result).toHaveLength(1)
  })

  it("one-time: already closed is excluded", () => {
    const pin = minimalPin({
      pin_type: "one_time",
      schedule_timezone: tz,
      start_time: `${baseDate}T08:00:00`,
      end_time: `${baseDate}T09:00:00`,
    })
    const result = filterPins([pin], { tag: null, time: "now", pinType: null, query: "", heartedOnly: false, mineOnly: false })
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
    const result = filterPins([pin], { tag: null, time: "now", pinType: null, query: "", heartedOnly: false, mineOnly: false })
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
    const result = filterPins([pin], { tag: null, time: "now", pinType: null, query: "", heartedOnly: false, mineOnly: false })
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
    const result = filterPins([pin], { tag: null, time: "now", pinType: null, query: "", heartedOnly: false, mineOnly: false })
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
    const result = filterPins([pin], { tag: null, time: "now", pinType: null, query: "", heartedOnly: false, mineOnly: false })
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
    const result = filterPins([pin], { tag: null, time: "now", pinType: null, query: "", heartedOnly: false, mineOnly: false })
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
    const result = filterPins([pin], { tag: null, time: "now", pinType: null, query: "", heartedOnly: false, mineOnly: false })
    expect(result).toHaveLength(1)
  })
})

describe("pinMatchesQuery", () => {
  it("matches title case-insensitively", () => {
    const pin = minimalPin({ title: "Joe's Pizza" })
    expect(pinMatchesQuery(pin, "pizza")).toBe(true)
    expect(pinMatchesQuery(pin, "JOE")).toBe(true)
  })

  it("matches description and tags", () => {
    const pin = minimalPin({
      title: "Place",
      description: "Great tacos here",
      tags: ["mexican", "lunch"],
    })
    expect(pinMatchesQuery(pin, "tacos")).toBe(true)
    expect(pinMatchesQuery(pin, "mexican")).toBe(true)
    expect(pinMatchesQuery(pin, "dinner")).toBe(false)
  })

  it("matches custom field values via raw custom_data", () => {
    const pin = minimalPin({
      title: "Place",
      custom_data: { venue: "Rooftop garden" },
    })
    expect(pinMatchesQuery(pin, "rooftop")).toBe(true)
  })

  it("empty query matches everything", () => {
    const pin = minimalPin({ title: "Anything" })
    expect(pinMatchesQuery(pin, "")).toBe(true)
    expect(pinMatchesQuery(pin, "   ")).toBe(true)
  })

  it("matches linked pin titles when allPins is provided", () => {
    const linked = minimalPin({ id: 2, title: "Secret Garden" })
    const pin = minimalPin({
      id: 1,
      title: "Main spot",
      linked_pins: [{ pin_id: 2, source_field: null }],
    })
    expect(pinMatchesQuery(pin, "garden", undefined, [pin, linked])).toBe(true)
    expect(pinMatchesQuery(pin, "garden")).toBe(false)
  })
})

describe("filterPins with query bypasses time filter", () => {
  const tz = "UTC"
  const baseDate = "2025-02-07"

  beforeEach(() => {
    vi.mocked(datetime.getNowInTimezone).mockReturnValue(NOW_PARTS)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("includes a closed one-time pin when query matches title", () => {
    const pin = minimalPin({
      title: "Late Night Club",
      pin_type: "one_time",
      schedule_timezone: tz,
      start_time: `${baseDate}T08:00:00`,
      end_time: `${baseDate}T09:00:00`,
    })
    const withoutQuery = filterPins([pin], { tag: null, time: "now", pinType: null, query: "", heartedOnly: false, mineOnly: false })
    const withQuery = filterPins([pin], { tag: null, time: "now", pinType: null, query: "club", heartedOnly: false, mineOnly: false })
    expect(withoutQuery).toHaveLength(0)
    expect(withQuery).toHaveLength(1)
  })

  it("excludes pins that do not match query", () => {
    const pin = minimalPin({ title: "Coffee Shop" })
    const result = filterPins([pin], { tag: null, time: "now", pinType: null, query: "pizza", heartedOnly: false, mineOnly: false })
    expect(result).toHaveLength(0)
  })
})

describe("filterPins with heartedOnly", () => {
  it("shows only saved pins when heartedOnly is true", () => {
    const saved = minimalPin({ id: 1, title: "Saved" })
    const other = minimalPin({ id: 2, title: "Other" })
    const hearted = new Set([1])
    const result = filterPins(
      [saved, other],
      { tag: null, time: "now", pinType: null, query: "", heartedOnly: true, mineOnly: false },
      [],
      hearted,
    )
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it("still applies the time filter when heartedOnly is true", () => {
    vi.mocked(datetime.getNowInTimezone).mockReturnValue(NOW_PARTS)
    const pin = minimalPin({
      id: 1,
      schedule_timezone: "UTC",
      start_time: "2025-02-07T08:00:00",
      end_time: "2025-02-07T09:00:00",
    })
    const result = filterPins(
      [pin],
      { tag: null, time: "now", pinType: null, query: "", heartedOnly: true, mineOnly: false },
      [],
      new Set([1]),
    )
    expect(result).toHaveLength(0)
  })
})

describe("filterPins with mineOnly", () => {
  it("shows only pins the viewer created when mineOnly is true", () => {
    const mine = minimalPin({ id: 1, title: "Mine", created_by_me: true })
    const other = minimalPin({ id: 2, title: "Other", created_by_me: false })
    const editableByMod = minimalPin({ id: 3, title: "Mod", is_owner: true, created_by_me: false })
    const result = filterPins(
      [mine, other, editableByMod],
      { tag: null, time: null, pinType: null, query: "", heartedOnly: false, mineOnly: true },
    )
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })
})

describe("pinMapGeoJsonSyncPart", () => {
  it("changes when filter-relevant pin fields change", () => {
    const base = minimalPin({ id: 1, title: "Cafe" })
    const baseKey = pinMapGeoJsonSyncPart(base)

    expect(pinMapGeoJsonSyncPart({ ...base, tags: ["food"] })).not.toBe(baseKey)
    expect(pinMapGeoJsonSyncPart({ ...base, description: "Open late" })).not.toBe(baseKey)
    expect(pinMapGeoJsonSyncPart({ ...base, schedule_timezone: "America/Chicago" })).not.toBe(baseKey)
    expect(pinMapGeoJsonSyncPart({ ...base, start_time: "2025-06-01T09:00:00" })).not.toBe(baseKey)
    expect(pinMapGeoJsonSyncPart({ ...base, end_time: "2025-06-01T17:00:00" })).not.toBe(baseKey)
    expect(pinMapGeoJsonSyncPart({ ...base, schedule_rrule: "FREQ=WEEKLY;BYDAY=MO" })).not.toBe(baseKey)
    expect(pinMapGeoJsonSyncPart({ ...base, custom_data: { note: "hello" } })).not.toBe(baseKey)
    expect(pinMapGeoJsonSyncPart({ ...base, updated_at: "2025-06-01T12:00:00Z" })).not.toBe(baseKey)
  })

  it("is stable when only non-map fields change", () => {
    const pin = minimalPin({
      id: 1,
      title: "Cafe",
      status: "pending",
      visible_on_world_map: false,
      is_owner: true,
      created_by_me: true,
      inserted_at: "2025-01-01T00:00:00Z",
    })
    const key = pinMapGeoJsonSyncPart(pin)
    expect(
      pinMapGeoJsonSyncPart({
        ...pin,
        status: "approved",
        visible_on_world_map: true,
        is_owner: false,
        created_by_me: false,
        inserted_at: "2025-02-01T00:00:00Z",
      }),
    ).toBe(key)
  })
})
