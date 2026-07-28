import { describe, expect, it } from "vitest"
import type { CustomPinType } from "../types"
import {
  CustomPinTimeMode,
  canWriteScheduleFromCatalog,
  scheduleCapabilities,
  showScheduleTimeFields,
  skipScheduleTimeValidation,
  usesOpenNowDatetimeWindow,
} from "./scheduleCapabilities"

const catalog: CustomPinType[] = [
  {
    id: 1,
    slug: "event",
    label: "Event",
    pin_type: "custom:event",
    enabled: true,
    time_mode: CustomPinTimeMode.OneTime,
    schema: { fields: [] },
  },
  {
    id: 2,
    slug: "shop",
    label: "Shop",
    pin_type: "custom:shop",
    enabled: true,
    time_mode: CustomPinTimeMode.Hours,
    schema: { fields: [] },
  },
  {
    id: 3,
    slug: "note",
    label: "Note",
    pin_type: "custom:note",
    enabled: true,
    time_mode: CustomPinTimeMode.None,
    schema: { fields: [] },
  },
]

describe("scheduleCapabilities", () => {
  it("resolves builtins without using custom time_mode enum", () => {
    expect(scheduleCapabilities("other")).toEqual({ kind: "none", allowOpen247: false })
    expect(scheduleCapabilities("one_time")).toEqual({ kind: "one_time", allowOpen247: false })
    expect(scheduleCapabilities("scheduled")).toEqual({ kind: "recurring", allowOpen247: false })
    expect(scheduleCapabilities("food_bank")).toEqual({ kind: "recurring", allowOpen247: true })
  })

  it("resolves custom types from catalog time_mode", () => {
    expect(scheduleCapabilities("custom:event", catalog)).toEqual({
      kind: "one_time",
      allowOpen247: false,
    })
    expect(scheduleCapabilities("custom:shop", catalog)).toEqual({
      kind: "recurring",
      allowOpen247: true,
    })
    expect(scheduleCapabilities("custom:note", catalog)).toEqual({
      kind: "none",
      allowOpen247: false,
    })
  })

  it("treats unknown custom types as none", () => {
    expect(scheduleCapabilities("custom:missing", catalog)).toEqual({
      kind: "none",
      allowOpen247: false,
    })
    expect(scheduleCapabilities("custom:event", [])).toEqual({
      kind: "none",
      allowOpen247: false,
    })
  })

  it("showScheduleTimeFields hides times for none and open 24/7", () => {
    expect(showScheduleTimeFields(scheduleCapabilities("other"), false)).toBe(false)
    expect(showScheduleTimeFields(scheduleCapabilities("food_bank"), true)).toBe(false)
    expect(showScheduleTimeFields(scheduleCapabilities("food_bank"), false)).toBe(true)
    expect(showScheduleTimeFields(scheduleCapabilities("custom:shop", catalog), false)).toBe(true)
  })

  it("skipScheduleTimeValidation for none and open 24/7", () => {
    expect(skipScheduleTimeValidation(scheduleCapabilities("other"), false)).toBe(true)
    expect(skipScheduleTimeValidation(scheduleCapabilities("food_bank"), true)).toBe(true)
    expect(skipScheduleTimeValidation(scheduleCapabilities("scheduled"), false)).toBe(false)
  })

  it("canWriteScheduleFromCatalog requires explicit custom time_mode", () => {
    expect(canWriteScheduleFromCatalog("one_time")).toBe(true)
    expect(canWriteScheduleFromCatalog("custom:missing", catalog)).toBe(false)
    expect(canWriteScheduleFromCatalog("custom:event", [])).toBe(false)
    expect(canWriteScheduleFromCatalog("custom:event", catalog)).toBe(true)
    expect(
      canWriteScheduleFromCatalog("custom:legacy", [
        {
          id: 9,
          slug: "legacy",
          label: "Legacy",
          pin_type: "custom:legacy",
          enabled: true,
          schema: { fields: [] },
        },
      ])
    ).toBe(false)
  })

  it("usesOpenNowDatetimeWindow falls back when catalog is missing", () => {
    expect(
      usesOpenNowDatetimeWindow(
        {
          pin_type: "custom:event",
          start_time: "2026-06-01T10:00:00",
          end_time: "2026-06-01T12:00:00",
        },
        []
      )
    ).toBe(true)
    expect(
      usesOpenNowDatetimeWindow(
        {
          pin_type: "custom:shop",
          start_time: "2000-01-01T09:00:00",
          schedule_rrule: "FREQ=DAILY",
        },
        []
      )
    ).toBe(false)
    expect(usesOpenNowDatetimeWindow({ pin_type: "other" }, [])).toBe(false)
  })
})
