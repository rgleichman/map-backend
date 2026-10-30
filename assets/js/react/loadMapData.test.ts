import { afterEach, describe, expect, it, vi } from "vitest"
import type { CatalogPinType, SubMap } from "./types"

const getPinTypes = vi.fn()
const getSubMap = vi.fn()
const getPins = vi.fn()
const getSubMapPins = vi.fn()

vi.mock("./api/client", () => ({
  getPinTypes: (...args: unknown[]) => getPinTypes(...args),
  getSubMap: (...args: unknown[]) => getSubMap(...args),
  getPins: (...args: unknown[]) => getPins(...args),
  getSubMapPins: (...args: unknown[]) => getSubMapPins(...args),
}))

import {
  bindCatalogRefreshOnOverlayClose,
  loadMapCatalog,
  loadMapData,
} from "./loadMapData"

const catalogType: CatalogPinType = {
  id: 10,
  slug: "vine",
  label: "Vine",
  marker_color: "#166534",
  icon: "grapes",
  schema: { fields: [] },
  pin_type: "vine",
  enabled: true,
}

const garden: SubMap = {
  community_url: "bbq-austin",
  name: "BBQ Austin",
  color: "#6366f1",
  contribution_mode: "open",
  promote_to_world_default: "ask",
  visibility: "public",
  settings: {},
  enabled_pin_types: [catalogType],
}

describe("loadMapCatalog", () => {
  afterEach(() => {
    getPinTypes.mockReset()
    getSubMap.mockReset()
    getPins.mockReset()
    getSubMapPins.mockReset()
  })

  it("loads world pin types without fetching pins", async () => {
    getPinTypes.mockResolvedValue({ data: [catalogType] })

    const result = await loadMapCatalog()

    expect(result).toEqual({ pinTypes: [catalogType], subMap: null })
    expect(getPinTypes).toHaveBeenCalledTimes(1)
    expect(getPins).not.toHaveBeenCalled()
    expect(getSubMap).not.toHaveBeenCalled()
    expect(getSubMapPins).not.toHaveBeenCalled()
  })

  it("loads garden catalog from enabled_pin_types without fetching pins", async () => {
    getSubMap.mockResolvedValue({ data: garden })

    const result = await loadMapCatalog("bbq-austin")

    expect(result).toEqual({ pinTypes: [catalogType], subMap: garden })
    expect(getSubMap).toHaveBeenCalledWith("bbq-austin")
    expect(getSubMapPins).not.toHaveBeenCalled()
    expect(getPinTypes).not.toHaveBeenCalled()
    expect(getPins).not.toHaveBeenCalled()
  })

  it("treats missing enabled_pin_types as an empty catalog", async () => {
    const { enabled_pin_types: _drop, ...withoutTypes } = garden
    getSubMap.mockResolvedValue({ data: withoutTypes })

    const result = await loadMapCatalog("bbq-austin")

    expect(result.pinTypes).toEqual([])
    expect(result.subMap).toEqual(withoutTypes)
  })
})

describe("loadMapData", () => {
  afterEach(() => {
    getPinTypes.mockReset()
    getSubMap.mockReset()
    getPins.mockReset()
    getSubMapPins.mockReset()
  })

  it("loads world pins together with catalog", async () => {
    getPins.mockResolvedValue({ data: [{ id: 1 }] })
    getPinTypes.mockResolvedValue({ data: [catalogType] })

    const result = await loadMapData()

    expect(result.pins).toEqual([{ id: 1 }])
    expect(result.pinTypes).toEqual([catalogType])
    expect(result.subMap).toBeNull()
  })
})

describe("bindCatalogRefreshOnOverlayClose", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("invokes refresh on overlay close and unbinds", () => {
    const listeners = new Map<string, EventListener>()
    vi.stubGlobal("window", {
      addEventListener: (type: string, fn: EventListener) => {
        listeners.set(type, fn)
      },
      removeEventListener: (type: string) => {
        listeners.delete(type)
      },
    })

    const refresh = vi.fn()
    const unbind = bindCatalogRefreshOnOverlayClose(refresh)
    listeners.get("map:overlay-close")?.(new Event("map:overlay-close"))
    expect(refresh).toHaveBeenCalledTimes(1)

    unbind()
    listeners.get("map:overlay-close")?.(new Event("map:overlay-close"))
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
