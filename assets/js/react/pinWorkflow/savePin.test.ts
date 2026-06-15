import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Pin } from "../types"
import type { DraftState } from "./types"
import { validateAndBuildSavePayload } from "./savePin"

function minimalDraft(overrides: Partial<DraftState> = {}): DraftState {
  return {
    pinType: "one_time",
    title: "Title",
    description: "Desc",
    tags: ["tag"],
    startTime: "2026-12-01T10:00",
    endTime: "2026-12-01T12:00",
    scheduleRrule: "",
    scheduleTimezone: "",
    open24_7: true,
    visibleOnWorldMap: true,
    addLocation: null,
    editLocation: null,
    ...overrides,
  }
}

function minimalPin(overrides: Partial<Pin> = {}): Pin {
  return {
    id: 42,
    title: "Old",
    latitude: 40,
    longitude: -74,
    pin_type: "one_time",
    tags: [],
    ...overrides,
  }
}

describe("validateAndBuildSavePayload", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-01T10:00:00"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns error when add has no pin type", () => {
    const result = validateAndBuildSavePayload(
      { mode: "add", lat: 1, lng: 2, pinType: "one_time" },
      minimalDraft({ pinType: null }),
      false
    )
    expect(result).toEqual({ timeError: "Please select a pin type" })
  })

  it("returns error when scheduled end is before start (time-only)", () => {
    const result = validateAndBuildSavePayload(
      { mode: "add", lat: 1, lng: 2, pinType: "scheduled" },
      minimalDraft({
        pinType: "scheduled",
        startTime: "17:00",
        endTime: "09:00",
      }),
      false
    )
    expect(result).toEqual({ timeError: "End time must be after start time." })
  })

  it("returns error when one_time end is in the past", () => {
    const result = validateAndBuildSavePayload(
      { mode: "add", lat: 1, lng: 2, pinType: "one_time" },
      minimalDraft({
        startTime: "2026-05-01T08:00",
        endTime: "2026-05-01T09:00",
      }),
      false
    )
    expect(result).toEqual({ timeError: "End time cannot be in the past." })
  })

  it("builds add payload with location from modal when addLocation unset", () => {
    const result = validateAndBuildSavePayload(
      { mode: "add", lat: 10, lng: 20, pinType: "one_time" },
      minimalDraft({ pinType: "one_time", visibleOnWorldMap: true }),
      false
    )
    expect(result).toMatchObject({
      mode: "add",
      payload: {
        title: "Title",
        pin_type: "one_time",
        latitude: 10,
        longitude: 20,
        tags: ["tag"],
      },
    })
    if ("payload" in result) {
      expect(result.payload.visible_on_world_map).toBeUndefined()
    }
  })

  it("includes visible_on_world_map on add when showPromoteToWorld", () => {
    const result = validateAndBuildSavePayload(
      { mode: "add", lat: 1, lng: 2, pinType: "one_time" },
      minimalDraft({ pinType: "one_time", visibleOnWorldMap: true }),
      true
    )
    if ("payload" in result) {
      expect(result.payload.visible_on_world_map).toBe(true)
    } else {
      throw new Error("expected add payload")
    }
  })

  it("builds edit payload with updated coordinates and world visibility", () => {
    const pin = minimalPin({ latitude: 40, longitude: -74 })
    const result = validateAndBuildSavePayload(
      { mode: "edit", pin },
      minimalDraft({
        title: "Updated",
        editLocation: { lat: 41, lng: -75 },
        visibleOnWorldMap: false,
      }),
      true
    )
    expect(result).toEqual({
      mode: "edit",
      pinId: 42,
      changes: expect.objectContaining({
        title: "Updated",
        latitude: 41,
        longitude: -75,
        visible_on_world_map: false,
      }),
    })
  })
})
