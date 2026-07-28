import { describe, expect, it } from "vitest"
import type { CatalogPinType } from "../types"
import {
  PinTimeMode,
  canWriteScheduleFromCatalog,
  scheduleCapabilities,
  showScheduleTimeFields,
  skipScheduleTimeValidation,
  usesOpenNowDatetimeWindow,
} from "./scheduleCapabilities"

const catalog: CatalogPinType[] = [
  {
    id: 1,
    slug: "event",
    label: "Event",
    pin_type: "event",
    enabled: true,
    time_mode: PinTimeMode.OneTime,
    schema: { fields: [] },
  },
  {
    id: 2,
    slug: "shop",
    label: "Shop",
    pin_type: "shop",
    enabled: true,
    time_mode: PinTimeMode.Hours,
    schema: { fields: [] },
  },
  {
    id: 3,
    slug: "note",
    label: "Note",
    pin_type: "note",
    enabled: true,
    time_mode: PinTimeMode.None,
    schema: { fields: [] },
  },
  {
    id: 4,
    slug: "pantry",
    label: "Pantry",
    pin_type: "pantry",
    enabled: true,
    time_mode: PinTimeMode.Hours,
    allow_open_24_7: true,
    schema: { fields: [] },
  },
]

describe("scheduleCapabilities", () => {
  it("resolves unknown slugs as none without catalog", () => {
    expect(scheduleCapabilities("other")).toEqual({ kind: "none", allowOpen247: false })
    expect(scheduleCapabilities("one_time")).toEqual({ kind: "none", allowOpen247: false })
  })

  it("resolves catalog time_mode and allow_open_24_7", () => {
    expect(scheduleCapabilities("event", catalog)).toEqual({
      kind: "one_time",
      allowOpen247: false,
    })
    expect(scheduleCapabilities("shop", catalog)).toEqual({
      kind: "recurring",
      allowOpen247: false,
    })
    expect(scheduleCapabilities("note", catalog)).toEqual({
      kind: "none",
      allowOpen247: false,
    })
    expect(scheduleCapabilities("pantry", catalog)).toEqual({
      kind: "recurring",
      allowOpen247: true,
    })
  })

  it("treats unknown types as none", () => {
    expect(scheduleCapabilities("missing", catalog)).toEqual({
      kind: "none",
      allowOpen247: false,
    })
    expect(scheduleCapabilities("event", [])).toEqual({
      kind: "none",
      allowOpen247: false,
    })
  })

  it("showScheduleTimeFields hides times for none and open 24/7", () => {
    expect(showScheduleTimeFields(scheduleCapabilities("note", catalog), false)).toBe(false)
    expect(showScheduleTimeFields(scheduleCapabilities("pantry", catalog), true)).toBe(false)
    expect(showScheduleTimeFields(scheduleCapabilities("pantry", catalog), false)).toBe(true)
    expect(showScheduleTimeFields(scheduleCapabilities("shop", catalog), false)).toBe(true)
  })

  it("skipScheduleTimeValidation for none and open 24/7", () => {
    expect(skipScheduleTimeValidation(scheduleCapabilities("note", catalog), false)).toBe(true)
    expect(skipScheduleTimeValidation(scheduleCapabilities("pantry", catalog), true)).toBe(true)
    expect(skipScheduleTimeValidation(scheduleCapabilities("shop", catalog), false)).toBe(false)
  })

  it("canWriteScheduleFromCatalog requires catalog time_mode", () => {
    expect(canWriteScheduleFromCatalog("one_time")).toBe(false)
    expect(canWriteScheduleFromCatalog("missing", catalog)).toBe(false)
    expect(canWriteScheduleFromCatalog("event", [])).toBe(false)
    expect(canWriteScheduleFromCatalog("event", catalog)).toBe(true)
    expect(
      canWriteScheduleFromCatalog("legacy", [
        {
          id: 9,
          slug: "legacy",
          label: "Legacy",
          pin_type: "legacy",
          enabled: true,
          schema: { fields: [] },
        },
      ])
    ).toBe(false)
  })

  it("usesOpenNowDatetimeWindow prefers one_time and falls back without RRULE", () => {
    expect(
      usesOpenNowDatetimeWindow(
        { pin_type: "event", start_time: "2020-01-01T10:00", end_time: "2020-01-01T12:00" },
        catalog
      )
    ).toBe(true)
    expect(
      usesOpenNowDatetimeWindow(
        { pin_type: "shop", start_time: "10:00", end_time: "17:00", schedule_rrule: "FREQ=DAILY" },
        catalog
      )
    ).toBe(false)
    expect(
      usesOpenNowDatetimeWindow(
        { pin_type: "missing", start_time: "2020-01-01T10:00", end_time: null },
        catalog
      )
    ).toBe(true)
  })
})
