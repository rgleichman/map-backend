import { describe, expect, it, vi } from "vitest"
import type * as maplibregl from "maplibre-gl"
import { CLUSTER_LAYER_IDS } from "./clusterInteraction"
import { emptySpiderfyFeatureSets } from "./spiderfy"
import {
  applySpiderfyFeatureSets,
  bumpSpiderfyOverlaySync,
  clearSpiderfyOverlay,
  createSpiderfyOverlayState,
  resetSpiderfyOverlayState,
  syncSpiderfyOverlay,
} from "./syncSpiderfyOverlay"

describe("SpiderfyOverlayState helpers", () => {
  it("bumps only the sync key", () => {
    const state = createSpiderfyOverlayState()
    state.lastSyncKey = "cached"
    state.generation = 3
    bumpSpiderfyOverlaySync(state)
    expect(state.lastSyncKey).toBe("")
    expect(state.generation).toBe(3)
  })

  it("resets sync key and advances generation", () => {
    const state = createSpiderfyOverlayState()
    state.lastSyncKey = "cached"
    state.generation = 3
    resetSpiderfyOverlayState(state)
    expect(state.lastSyncKey).toBe("")
    expect(state.generation).toBe(4)
  })
})

describe("applySpiderfyFeatureSets", () => {
  it("writes leaf/leg sources and updates cluster filters", () => {
    const leafSetData = vi.fn()
    const legSetData = vi.fn()
    const setFilter = vi.fn()
    const map = {
      getCenter: () => ({ lng: -122.4, lat: 37.8 }),
      getZoom: () => 14,
      getSource: (id: string) => {
        if (id === "pin-spider-leaves") return { setData: leafSetData }
        if (id === "pin-spider-legs") return { setData: legSetData }
        return undefined
      },
      getLayer: () => ({}),
      setFilter,
    } as unknown as maplibregl.Map

    const state = createSpiderfyOverlayState()
    const sets = emptySpiderfyFeatureSets()
    sets.clusterIds = [9]

    applySpiderfyFeatureSets(map, state, sets, null)

    expect(leafSetData).toHaveBeenCalledOnce()
    expect(legSetData).toHaveBeenCalledOnce()
    expect(setFilter).toHaveBeenCalledTimes(CLUSTER_LAYER_IDS.length)
    for (const layerId of CLUSTER_LAYER_IDS) {
      expect(setFilter).toHaveBeenCalledWith(
        layerId,
        expect.arrayContaining(["all", ["has", "point_count"]]),
      )
    }

    // Second identical apply is a no-op.
    applySpiderfyFeatureSets(map, state, sets, null)
    expect(leafSetData).toHaveBeenCalledOnce()
  })

  it("clearSpiderfyOverlay forces an empty write even when key matches", () => {
    const leafSetData = vi.fn()
    const legSetData = vi.fn()
    const setFilter = vi.fn()
    const map = {
      getCenter: () => ({ lng: 0, lat: 0 }),
      getZoom: () => 14,
      getSource: (id: string) => {
        if (id === "pin-spider-leaves" || id === "pin-spider-legs") {
          return { setData: id === "pin-spider-leaves" ? leafSetData : legSetData }
        }
        return undefined
      },
      getLayer: () => ({}),
      setFilter,
    } as unknown as maplibregl.Map

    const state = createSpiderfyOverlayState()
    clearSpiderfyOverlay(map, state, null)
    expect(leafSetData).toHaveBeenCalledOnce()
    clearSpiderfyOverlay(map, state, null)
    expect(leafSetData).toHaveBeenCalledTimes(2)
  })
})

describe("syncSpiderfyOverlay", () => {
  it("clears the overlay when the matching source is missing", async () => {
    const leafSetData = vi.fn()
    const legSetData = vi.fn()
    const setFilter = vi.fn()
    const map = {
      getZoom: () => 14,
      getCenter: () => ({ lng: 0, lat: 0 }),
      getSource: (id: string) => {
        if (id === "pin-features-matching") return undefined
        if (id === "pin-spider-leaves") return { setData: leafSetData }
        if (id === "pin-spider-legs") return { setData: legSetData }
        return undefined
      },
      getLayer: () => ({}),
      setFilter,
      querySourceFeatures: vi.fn(),
    } as unknown as maplibregl.Map

    await syncSpiderfyOverlay(map, createSpiderfyOverlayState(), { selectedPinId: null })
    expect(leafSetData).toHaveBeenCalledWith({ type: "FeatureCollection", features: [] })
    expect(setFilter).toHaveBeenCalled()
  })
})
