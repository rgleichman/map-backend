import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Pin } from "../types"
import type { CatalogPinType } from "../types"
import type { DraftState } from "./types"
import { validateAndBuildSavePayload } from "./savePin"
import { BlobFieldType } from "../utils/blobFieldType"

const systemCatalog: CatalogPinType[] = [
  {
    id: 1,
    slug: "one_time",
    label: "One-time event",
    pin_type: "one_time",
    enabled: true,
    time_mode: "one_time",
    schema: { fields: [] },
  },
  {
    id: 2,
    slug: "scheduled",
    label: "Scheduled recurring",
    pin_type: "scheduled",
    enabled: true,
    time_mode: "hours",
    schema: { fields: [] },
  },
]

function minimalDraft(overrides: Partial<DraftState> = {}): DraftState {
  return {
    pinType: "one_time",
    title: "Title",
    description: "Desc",
    tags: ["tag"],
    customData: {},
    adHocFields: [],
    startTime: "2026-12-01T10:00",
    endTime: "2026-12-01T12:00",
    scheduleRrule: "",
    scheduleTimezone: "",
    open24_7: true,
    visibleOnWorldMap: true,
    linkedPinIds: [],
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
    pin_type_id: 1,
    status: "approved",
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
    expect(result).toEqual({ kind: "form", message: "Please select a pin type" })
  })

  it("returns error when scheduled end is before start (time-only)", () => {
    const result = validateAndBuildSavePayload(
      { mode: "add", lat: 1, lng: 2, pinType: "scheduled" },
      minimalDraft({
        pinType: "scheduled",
        startTime: "17:00",
        endTime: "09:00",
      }),
      false,
      systemCatalog
    )
    expect(result).toEqual({ kind: "time", message: "End time must be after start time." })
  })

  it("returns error when one_time end is in the past", () => {
    const result = validateAndBuildSavePayload(
      { mode: "add", lat: 1, lng: 2, pinType: "one_time" },
      minimalDraft({
        startTime: "2026-05-01T08:00",
        endTime: "2026-05-01T09:00",
      }),
      false,
      systemCatalog
    )
    expect(result).toEqual({ kind: "time", message: "End time cannot be in the past." })
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
      true,
      systemCatalog
    )
    expect(result).toEqual({
      mode: "edit",
      pinId: 42,
      blobDrafts: {},
      adHocBlobDrafts: {},
      changes: expect.objectContaining({
        title: "Updated",
        latitude: 41,
        longitude: -75,
        visible_on_world_map: false,
      }),
    })
  })

  it("strips blob drafts from custom_data in edit payload", () => {
    const draftPayload = JSON.stringify({
      version: 1,
      tempo: 120,
      steps: 16,
      rows: [
        {
          note: "C4",
          hits: Array.from({ length: 16 }, (_, i) => i === 0),
        },
      ],
    })
    const catalog: CatalogPinType[] = [
      {
        id: 1,
        slug: "jam-pin",
        label: "Jam Pin",
        pin_type: "jam-pin",
        enabled: true,
        schema: {
          fields: [{ key: "song", type: BlobFieldType.Music, label: "Song", required: true }],
        },
      },
    ]
    const pin = minimalPin({
      pin_type: "jam-pin",
      custom_data: { song: { ref: 99 } },
    })
    const result = validateAndBuildSavePayload(
      { mode: "edit", pin },
      minimalDraft({
        pinType: "jam-pin",
        customData: { song: { draft: draftPayload } },
      }),
      false,
      catalog
    )
    if ("changes" in result) {
      expect(result.changes.custom_data).toEqual({})
      expect(result.blobDrafts).toEqual({ song: { type: BlobFieldType.Music, payload: draftPayload } })
    } else {
      throw new Error("expected edit payload")
    }
  })

  it("strips blob drafts from custom_data in add payload", () => {
    const draftPayload = JSON.stringify({
      version: 1,
      tempo: 120,
      steps: 16,
      rows: [
        {
          note: "C4",
          hits: [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        },
      ],
    })
    const catalog: CatalogPinType[] = [
      {
        id: 1,
        slug: "song-pin",
        label: "Song Pin",
        pin_type: "song-pin",
        enabled: true,
        schema: {
          fields: [{ key: "song", type: BlobFieldType.Music, label: "Song", required: true }],
        },
      },
    ]
    const result = validateAndBuildSavePayload(
      { mode: "add", lat: 1, lng: 2, pinType: "song-pin" },
      minimalDraft({
        pinType: "song-pin",
        customData: { song: { draft: draftPayload } },
      }),
      false,
      catalog
    )
    if ("payload" in result) {
      expect(result.payload.custom_data).toEqual({})
      expect(result.blobDrafts).toEqual({ song: { type: BlobFieldType.Music, payload: draftPayload } })
    } else {
      throw new Error("expected add payload")
    }
  })

  it("infers music blob type from payload when catalog is empty", () => {
    const draftPayload = JSON.stringify({
      version: 1,
      tempo: 120,
      steps: 16,
      rows: [
        {
          note: "C4",
          hits: [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        },
      ],
    })
    const result = validateAndBuildSavePayload(
      { mode: "add", lat: 1, lng: 2, pinType: "song-pin" },
      minimalDraft({
        pinType: "song-pin",
        customData: { song: { draft: draftPayload } },
      }),
      false,
      []
    )
    if ("payload" in result) {
      expect(result.payload.custom_data).toEqual({})
      expect(result.blobDrafts).toEqual({ song: { type: BlobFieldType.Music, payload: draftPayload } })
    } else {
      throw new Error("expected add payload")
    }
  })

  it("infers drawing blob type from payload when catalog is empty", () => {
    const draftPayload = JSON.stringify({
      version: 1,
      width: 256,
      height: 256,
      strokes: [{ tool: "pen", size: 2, points: [[1, 2], [3, 4]] }],
    })
    const result = validateAndBuildSavePayload(
      { mode: "add", lat: 1, lng: 2, pinType: "sketch-pin" },
      minimalDraft({
        pinType: "sketch-pin",
        customData: { sketch: { draft: draftPayload } },
      }),
      false,
      []
    )
    if ("payload" in result) {
      expect(result.payload.custom_data).toEqual({})
      expect(result.blobDrafts).toEqual({ sketch: { type: BlobFieldType.Drawing, payload: draftPayload } })
    } else {
      throw new Error("expected add payload")
    }
  })

  it("strips drawing blob drafts from custom_data in add payload", () => {
    const draftPayload = JSON.stringify({
      version: 1,
      width: 256,
      height: 256,
      strokes: [{ tool: "pen", size: 2, points: [[1, 2], [3, 4]] }],
    })
    const catalog: CatalogPinType[] = [
      {
        id: 1,
        slug: "sketch-pin",
        label: "Sketch Pin",
        pin_type: "sketch-pin",
        enabled: true,
        schema: {
          fields: [{ key: "sketch", type: BlobFieldType.Drawing, label: "Sketch", required: true }],
        },
      },
    ]
    const result = validateAndBuildSavePayload(
      { mode: "add", lat: 1, lng: 2, pinType: "sketch-pin" },
      minimalDraft({
        pinType: "sketch-pin",
        customData: { sketch: { draft: draftPayload } },
      }),
      false,
      catalog
    )
    if ("payload" in result) {
      expect(result.payload.custom_data).toEqual({})
      expect(result.blobDrafts).toEqual({ sketch: { type: BlobFieldType.Drawing, payload: draftPayload } })
    } else {
      throw new Error("expected add payload")
    }
  })

  it("includes time fields for custom hours pins", () => {
    const catalog: CatalogPinType[] = [
      {
        id: 1,
        slug: "shop",
        label: "Shop",
        pin_type: "shop",
        enabled: true,
        time_mode: "hours",
        schema: { fields: [] },
      },
    ]
    const result = validateAndBuildSavePayload(
      { mode: "add", lat: 1, lng: 2, pinType: "shop" },
      minimalDraft({
        pinType: "shop",
        startTime: "09:00",
        endTime: "17:00",
        scheduleRrule: "FREQ=DAILY",
        open24_7: false,
        customData: {},
      }),
      false,
      catalog
    )
    if ("payload" in result) {
      expect(result.payload.start_time).toBe("2000-01-01T09:00:00")
      expect(result.payload.end_time).toBe("2000-01-01T17:00:00")
      expect(result.payload.schedule_rrule).toBe("FREQ=DAILY")
      expect(result.payload.custom_data).toEqual({})
    } else {
      throw new Error("expected add payload")
    }
  })

  it("omits schedule nulls on edit when custom type is missing from catalog", () => {
    const pin = minimalPin({
      pin_type: "shop",
      start_time: "2000-01-01T09:00:00",
      end_time: "2000-01-01T17:00:00",
      schedule_rrule: "FREQ=DAILY",
    })
    const result = validateAndBuildSavePayload(
      { mode: "edit", pin },
      minimalDraft({
        pinType: "shop",
        title: "Renamed",
        customData: {},
      }),
      false,
      []
    )
    if ("changes" in result) {
      expect(result.changes.title).toBe("Renamed")
      expect(result.changes).not.toHaveProperty("start_time")
      expect(result.changes).not.toHaveProperty("end_time")
      expect(result.changes).not.toHaveProperty("schedule_rrule")
    } else {
      throw new Error("expected edit payload")
    }
  })

  it("omits schedule nulls on edit when catalog entry lacks time_mode", () => {
    const pin = minimalPin({
      pin_type: "shop",
      start_time: "2000-01-01T09:00:00",
      end_time: "2000-01-01T17:00:00",
      schedule_rrule: "FREQ=DAILY",
    })
    const catalog: CatalogPinType[] = [
      {
        id: 1,
        slug: "shop",
        label: "Shop",
        pin_type: "shop",
        enabled: true,
        schema: { fields: [] },
      },
    ]
    const result = validateAndBuildSavePayload(
      { mode: "edit", pin },
      minimalDraft({
        pinType: "shop",
        title: "Renamed",
        customData: {},
      }),
      false,
      catalog
    )
    if ("changes" in result) {
      expect(result.changes).not.toHaveProperty("start_time")
      expect(result.changes).not.toHaveProperty("end_time")
      expect(result.changes).not.toHaveProperty("schedule_rrule")
    } else {
      throw new Error("expected edit payload")
    }
  })
})
