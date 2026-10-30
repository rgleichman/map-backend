import { afterEach, describe, expect, it, vi } from "vitest"
import type { CatalogPinType } from "../../types"
import { getPinTypeMarkerImageId } from "../../utils/pinTypeIcons"
import { registerCustomPinImages } from "./registerCustomPinImages"

class FakeImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  set src(_value: string) {
    queueMicrotask(() => this.onload?.())
  }
}

function fakeMap() {
  const images = new Set<string>()
  return {
    hasImage: (id: string) => images.has(id),
    addImage: (id: string) => {
      images.add(id)
    },
    removeImage: (id: string) => {
      images.delete(id)
    },
  }
}

const catalogType: CatalogPinType = {
  id: 1,
  slug: "scheduled",
  label: "Scheduled",
  marker_color: "#3b82f6",
  icon: "calendar",
  schema: { fields: [] },
  pin_type: "scheduled",
  enabled: true,
}

describe("registerCustomPinImages", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("replaces MapLibre images when the catalog icon changes", async () => {
    vi.stubGlobal("Image", FakeImage)
    const map = fakeMap()
    const first = await registerCustomPinImages({
      map: map as never,
      catalog: [catalogType],
      knownCustomImageIds: new Set(),
      customImageVisualKeys: new Map(),
      isCancelled: () => false,
    })
    expect(first).not.toBeNull()
    const oldId = getPinTypeMarkerImageId("scheduled", [catalogType])
    expect(map.hasImage(oldId)).toBe(true)

    const nextCatalog = [{ ...catalogType, icon: "grapes" }]
    const second = await registerCustomPinImages({
      map: map as never,
      catalog: nextCatalog,
      knownCustomImageIds: first!.knownCustomImageIds,
      customImageVisualKeys: first!.customImageVisualKeys,
      isCancelled: () => false,
    })
    expect(second).not.toBeNull()
    const newId = getPinTypeMarkerImageId("scheduled", nextCatalog)
    expect(newId).not.toBe(oldId)
    expect(map.hasImage(newId)).toBe(true)
    expect(map.hasImage(oldId)).toBe(false)
  })
})
