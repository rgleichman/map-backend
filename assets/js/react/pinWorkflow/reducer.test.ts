import { describe, expect, it } from "vitest"
import type { CatalogPinType, Pin } from "../types"
import { initialPinWorkflowState, pinWorkflowReducer } from "./reducer"

function minimalPin(overrides: Partial<Pin> = {}): Pin {
  return {
    id: 1,
    title: "Existing",
    latitude: 40,
    longitude: -74,
    pin_type: "one_time",
    pin_type_id: 1,
    status: "approved",
    tags: ["a"],
    description: "desc",
    visible_on_world_map: true,
    start_time: "2026-06-01T10:00:00",
    end_time: "2026-06-01T12:00:00",
    ...overrides,
  }
}


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
  {
    id: 3,
    slug: "food_bank",
    label: "Food bank",
    pin_type: "food_bank",
    enabled: true,
    time_mode: "hours",
    allow_open_24_7: true,
    schema: { fields: [] },
  },
]

describe("pinWorkflowReducer", () => {
  it("begin_add_at sets placement and seeds addLocation", () => {
    const next = pinWorkflowReducer(initialPinWorkflowState, { type: "begin_add_at", lat: 1, lng: 2 })
    expect(next.modal).toBeNull()
    expect(next.placement).toEqual({ intent: "add", lat: 1, lng: 2 })
    expect(next.draft.addLocation).toEqual({ lat: 1, lng: 2 })
    expect(next.timeError).toBe("")
  })

  it("open_add sets scheduled default times", () => {
    const next = pinWorkflowReducer(initialPinWorkflowState, {
      type: "open_add",
      lat: 1,
      lng: 2,
      pinType: "scheduled",
      catalog: systemCatalog,
    })
    expect(next.modal).toEqual({ mode: "add", lat: 1, lng: 2, pinType: "scheduled" })
    expect(next.draft.pinType).toBe("scheduled")
    expect(next.draft.startTime).toBe("09:00")
    expect(next.draft.endTime).toBe("17:00")
  })

  it("open_add sets food_bank open24_7", () => {
    const withClosed = pinWorkflowReducer(initialPinWorkflowState, {
      type: "set_open_24_7",
      open24_7: false,
    })
    const next = pinWorkflowReducer(withClosed, {
      type: "open_add",
      lat: 1,
      lng: 2,
      pinType: "food_bank",
      catalog: systemCatalog,
    })
    expect(next.draft.open24_7).toBe(true)
  })

  it("open_add sets custom hours open24_7 from catalog", () => {
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
    const next = pinWorkflowReducer(initialPinWorkflowState, {
      type: "open_add",
      lat: 1,
      lng: 2,
      pinType: "shop",
      catalog,
    })
    expect(next.draft.open24_7).toBe(true)
    expect(next.draft.startTime).toBe("09:00")
  })

  it("open_edit hydrates custom one_time times from catalog", () => {
    const catalog = [
      {
        id: 1,
        slug: "event",
        label: "Event",
        pin_type: "event" as const,
        enabled: true,
        time_mode: "one_time" as const,
        schema: { fields: [] },
      },
    ]
    const pin = minimalPin({
      pin_type: "event",
      start_time: "2026-06-01T10:00:00",
      end_time: "2026-06-01T12:00:00",
    })
    const next = pinWorkflowReducer(initialPinWorkflowState, { type: "open_edit", pin, catalog })
    expect(next.draft.startTime).toContain("2026")
    expect(next.draft.endTime).toContain("2026")
  })

  it("open_edit hydrates draft from pin including visibleOnWorldMap", () => {
    const pin = minimalPin({ visible_on_world_map: true, tags: ["x", "y"] })
    const next = pinWorkflowReducer(initialPinWorkflowState, { type: "open_edit", pin })
    expect(next.modal).toEqual({ mode: "edit", pin })
    expect(next.draft.title).toBe("Existing")
    expect(next.draft.tags).toEqual(["x", "y"])
    expect(next.draft.visibleOnWorldMap).toBe(true)
    expect(next.draft.editLocation).toBeNull()
  })

  it("close_all clears modal, placement, and timeError", () => {
    let state = pinWorkflowReducer(initialPinWorkflowState, { type: "begin_add_at", lat: 1, lng: 2 })
    state = pinWorkflowReducer(state, { type: "set_time_error", timeError: "oops" })
    state = pinWorkflowReducer(state, { type: "set_form_error", formError: "nope" })
    const next = pinWorkflowReducer(state, { type: "close_all" })
    expect(next.modal).toBeNull()
    expect(next.placement).toBeNull()
    expect(next.timeError).toBe("")
    expect(next.formError).toBe("")
  })

  it("after_add_saved clears addLocation and pinType", () => {
    let state = pinWorkflowReducer(initialPinWorkflowState, {
      type: "open_add",
      lat: 1,
      lng: 2,
      pinType: "one_time",
    })
    state = pinWorkflowReducer(state, { type: "set_add_location", lat: 3, lng: 4 })
    const next = pinWorkflowReducer(state, { type: "after_add_saved" })
    expect(next.draft.addLocation).toBeNull()
    expect(next.draft.pinType).toBeNull()
  })

  it("open_view sets view modal", () => {
    const pin = minimalPin()
    const next = pinWorkflowReducer(initialPinWorkflowState, { type: "open_view", pin })
    expect(next.modal).toEqual({ mode: "view", pin })
    expect(next.placement).toBeNull()
  })

  it("open_edit from view hydrates draft and switches mode", () => {
    const pin = minimalPin({ title: "Cafe" })
    let state = pinWorkflowReducer(initialPinWorkflowState, { type: "open_view", pin })
    state = pinWorkflowReducer(state, { type: "open_edit", pin })
    expect(state.modal).toEqual({ mode: "edit", pin })
    expect(state.draft.title).toBe("Cafe")
  })

  it("cancel_edit returns to view with the same pin", () => {
    const pin = minimalPin()
    let state = pinWorkflowReducer(initialPinWorkflowState, { type: "open_edit", pin })
    state = pinWorkflowReducer(state, { type: "set_title", title: "Changed" })
    const next = pinWorkflowReducer(state, { type: "cancel_edit" })
    expect(next.modal).toEqual({ mode: "view", pin })
    expect(next.placement).toBeNull()
  })

  it("cancel_edit is a no-op when not editing", () => {
    const pin = minimalPin()
    const state = pinWorkflowReducer(initialPinWorkflowState, { type: "open_view", pin })
    const next = pinWorkflowReducer(state, { type: "cancel_edit" })
    expect(next).toBe(state)
  })

  it("after_edit_saved returns to view with the saved pin", () => {
    const pin = minimalPin({ title: "Old" })
    const saved = minimalPin({ title: "New" })
    let state = pinWorkflowReducer(initialPinWorkflowState, { type: "open_edit", pin })
    state = pinWorkflowReducer(state, { type: "set_edit_location", lat: 1, lng: 2 })
    const next = pinWorkflowReducer(state, { type: "after_edit_saved", pin: saved })
    expect(next.modal).toEqual({ mode: "view", pin: saved })
    expect(next.draft.editLocation).toBeNull()
  })
})
