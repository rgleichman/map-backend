import { describe, expect, it } from "vitest"
import type { CatalogPinType } from "../types"
import { buildPinTimeFields } from "./buildPinPayload"

const systemCatalog: CatalogPinType[] = [
  {
    id: 1,
    slug: "other",
    label: "Other",
    pin_type: "other",
    enabled: true,
    time_mode: "none",
    schema: { fields: [] },
  },
  {
    id: 2,
    slug: "one_time",
    label: "One-time event",
    pin_type: "one_time",
    enabled: true,
    time_mode: "one_time",
    schema: { fields: [] },
  },
  {
    id: 3,
    slug: "scheduled",
    label: "Scheduled recurring",
    pin_type: "scheduled",
    enabled: true,
    time_mode: "hours",
    schema: { fields: [] },
  },
  {
    id: 4,
    slug: "food_bank",
    label: "Food bank",
    pin_type: "food_bank",
    enabled: true,
    time_mode: "hours",
    allow_open_24_7: true,
    schema: { fields: [] },
  },
]

describe("buildPinTimeFields", () => {
  it("returns null times for other pin type", () => {
    expect(buildPinTimeFields("other", false, "10:00", "12:00", "", systemCatalog)).toEqual({
      start_time: null,
      end_time: null,
      schedule_rrule: null,
    })
  })

  it("returns null times for food_bank when open 24/7", () => {
    expect(
      buildPinTimeFields("food_bank", true, "09:00", "17:00", "FREQ=DAILY", systemCatalog)
    ).toEqual({
      start_time: null,
      end_time: null,
      schedule_rrule: null,
    })
  })

  it("uses time-only ISO for scheduled pins", () => {
    expect(
      buildPinTimeFields("scheduled", false, "09:00", "17:00", "FREQ=WEEKLY;BYDAY=MO", systemCatalog)
    ).toEqual({
      start_time: "2000-01-01T09:00:00",
      end_time: "2000-01-01T17:00:00",
      schedule_rrule: "FREQ=WEEKLY;BYDAY=MO",
    })
  })

  it("uses datetime-local ISO for one_time pins", () => {
    expect(
      buildPinTimeFields(
        "one_time",
        false,
        "2026-06-01T10:00",
        "2026-06-01T12:00",
        "",
        systemCatalog
      )
    ).toEqual({
      start_time: "2026-06-01T10:00:00",
      end_time: "2026-06-01T12:00:00",
      schedule_rrule: undefined,
    })
  })

  it("uses catalog time_mode for custom hours pins", () => {
    const catalog = [
      {
        id: 1,
        slug: "shop",
        label: "Shop",
        pin_type: "shop" as const,
        enabled: true,
        time_mode: "hours" as const,
        schema: { fields: [] },
      },
    ]
    expect(
      buildPinTimeFields("shop", false, "09:00", "17:00", "FREQ=DAILY", catalog)
    ).toEqual({
      start_time: "2000-01-01T09:00:00",
      end_time: "2000-01-01T17:00:00",
      schedule_rrule: "FREQ=DAILY",
    })
  })

  it("clears times for custom hours when open 24/7", () => {
    const catalog = [
      {
        id: 1,
        slug: "shop",
        label: "Shop",
        pin_type: "shop" as const,
        enabled: true,
        time_mode: "hours" as const,
        allow_open_24_7: true,
        schema: { fields: [] },
      },
    ]
    expect(
      buildPinTimeFields("shop", true, "09:00", "17:00", "FREQ=DAILY", catalog)
    ).toEqual({
      start_time: null,
      end_time: null,
      schedule_rrule: null,
    })
  })
})
