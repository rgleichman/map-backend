import { describe, expect, it } from "vitest"
import type { Pin } from "../types"
import { deriveWorkflowUI } from "./deriveWorkflowUI"
import type { WorkflowUIDerivation } from "./deriveWorkflowUI"
import { initialPinWorkflowState, pinWorkflowReducer } from "./reducer"
import type { PinWorkflowState } from "./types"

function minimalPin(overrides: Partial<Pin> = {}): Pin {
  return {
    id: 1,
    title: "Existing",
    latitude: 40,
    longitude: -74,
    pin_type: "scheduled",
    status: "approved",
    tags: [],
    ...overrides,
  }
}

function workflowUIForState(state: PinWorkflowState, isDesktop = false): WorkflowUIDerivation {
  const { modal, placement, draft } = state
  const { addLocation, editLocation, pinType } = draft
  return deriveWorkflowUI({ modal, placement, addLocation, editLocation, pinType, isDesktop })
}

/** Mirrors the useMemo cache in usePinWorkflow. */
function memoizedWorkflowUI(
  cache: { deps: unknown[]; result: WorkflowUIDerivation } | null,
  state: PinWorkflowState,
  isDesktop: boolean
): { cache: { deps: unknown[]; result: WorkflowUIDerivation }; result: WorkflowUIDerivation } {
  const { modal, placement, draft } = state
  const { addLocation, editLocation, pinType } = draft
  const deps = [modal, placement, addLocation, editLocation, pinType, isDesktop]

  if (cache && deps.every((dep, index) => Object.is(dep, cache.deps[index]))) {
    return { cache, result: cache.result }
  }

  const nextCache = {
    deps,
    result: deriveWorkflowUI({ modal, placement, addLocation, editLocation, pinType, isDesktop }),
  }
  return { cache: nextCache, result: nextCache.result }
}

describe("deriveWorkflowUI", () => {
  it("derives pending location and pin type while adding", () => {
    const ui = deriveWorkflowUI({
      modal: { mode: "add", lat: 30, lng: -97, pinType: "one_time" },
      placement: null,
      addLocation: { lat: 30.1, lng: -97.1 },
      editLocation: null,
      pinType: "food_bank",
      isDesktop: true,
    })

    expect(ui.pendingLocation).toEqual({ lat: 30.1, lng: -97.1 })
    expect(ui.pendingPinType).toBe("food_bank")
    expect(ui.showAddForm).toBe(true)
    expect(ui.showEditForm).toBe(false)
    expect(ui.showPlacementOverlay).toBe(false)
    expect(ui.pinModalLat).toBe(30.1)
    expect(ui.pinModalLng).toBe(-97.1)
  })

  it("prefers placement over modal while picking a new location", () => {
    const pin = minimalPin()
    const ui = deriveWorkflowUI({
      modal: { mode: "edit", pin },
      placement: { intent: "edit", pin, lat: 41, lng: -75 },
      addLocation: null,
      editLocation: { lat: 40.5, lng: -74.5 },
      pinType: null,
      isDesktop: true,
    })

    expect(ui.pendingLocation).toEqual({ lat: 41, lng: -75 })
    expect(ui.pendingPinType).toBe("scheduled")
    expect(ui.showEditForm).toBe(false)
    expect(ui.showPlacementOverlay).toBe(true)
  })

  it("returns null pending state when workflow is closed", () => {
    const ui = deriveWorkflowUI({
      modal: null,
      placement: null,
      addLocation: null,
      editLocation: null,
      pinType: null,
      isDesktop: false,
    })

    expect(ui.pendingLocation).toBeNull()
    expect(ui.pendingPinType).toBeNull()
    expect(ui.editingPinId).toBeNull()
    expect(ui.showViewDetail).toBe(false)
  })

  it("shows view detail without pending placement marker", () => {
    const pin = minimalPin()
    const ui = deriveWorkflowUI({
      modal: { mode: "view", pin },
      placement: null,
      addLocation: null,
      editLocation: null,
      pinType: null,
      isDesktop: true,
    })

    expect(ui.showViewDetail).toBe(true)
    expect(ui.pendingLocation).toBeNull()
    expect(ui.editingPinId).toBeNull()
    expect(ui.showEditForm).toBe(false)
  })

  it("keeps workflow UI stable when only unrelated draft fields change", () => {
    let state = pinWorkflowReducer(initialPinWorkflowState, {
      type: "open_add",
      lat: 30,
      lng: -97,
      pinType: "one_time",
    })

    const before = workflowUIForState(state)

    state = pinWorkflowReducer(state, { type: "set_title", title: "BBQ spot" })
    state = pinWorkflowReducer(state, { type: "set_description", description: "Smoky" })

    const after = workflowUIForState(state)

    expect(after.pendingLocation).toEqual(before.pendingLocation)
    expect(after.pendingPinType).toBe(before.pendingPinType)
    expect(after.showAddForm).toBe(before.showAddForm)
  })

  it("memoized workflow UI keeps pendingLocation reference across unrelated draft edits", () => {
    let state = pinWorkflowReducer(initialPinWorkflowState, {
      type: "open_add",
      lat: 30,
      lng: -97,
      pinType: "one_time",
    })

    let cache: { deps: unknown[]; result: WorkflowUIDerivation } | null = null
    const first = memoizedWorkflowUI(cache, state, false)
    cache = first.cache

    state = pinWorkflowReducer(state, { type: "set_title", title: "BBQ spot" })
    const second = memoizedWorkflowUI(cache, state, false)

    expect(second.result.pendingLocation).toBe(first.result.pendingLocation)
    expect(second.result.pendingPinType).toBe(first.result.pendingPinType)
  })

  it("memoized workflow UI recomputes when location-related draft fields change", () => {
    let state = pinWorkflowReducer(initialPinWorkflowState, {
      type: "open_add",
      lat: 30,
      lng: -97,
      pinType: "one_time",
    })

    let cache: { deps: unknown[]; result: WorkflowUIDerivation } | null = null
    const first = memoizedWorkflowUI(cache, state, false)
    cache = first.cache

    state = pinWorkflowReducer(state, { type: "set_add_location", lat: 31, lng: -98 })
    const second = memoizedWorkflowUI(cache, state, false)

    expect(second.result.pendingLocation).not.toBe(first.result.pendingLocation)
    expect(second.result.pendingLocation).toEqual({ lat: 31, lng: -98 })
  })
})
