import { describe, expect, it } from "vitest"
import type { Pin } from "../types"
import { initialPinWorkflowState, pinWorkflowReducer } from "./reducer"

function minimalPin(overrides: Partial<Pin> = {}): Pin {
  return {
    id: 1,
    title: "Existing",
    latitude: 40,
    longitude: -74,
    pin_type: "one_time",
    status: "approved",
    tags: ["a"],
    description: "desc",
    visible_on_world_map: true,
    start_time: "2026-06-01T10:00:00",
    end_time: "2026-06-01T12:00:00",
    ...overrides,
  }
}

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
    })
    expect(next.draft.open24_7).toBe(true)
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
})
