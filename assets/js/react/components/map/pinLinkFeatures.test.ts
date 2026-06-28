import { describe, expect, it } from "vitest"
import type { CustomPinType, Pin } from "../../types"
import { CLEARED_FILTER, DEFAULT_FILTER } from "./filters"
import {
  buildPinLinkGeoJson,
  undirectedEdgeKey,
} from "./pinLinkFeatures"

function minimalPin(overrides: Partial<Pin>): Pin {
  return {
    id: 1,
    title: "",
    latitude: 0,
    longitude: 0,
    pin_type: "one_time",
    status: "approved",
    tags: [],
    ...overrides,
  }
}

describe("undirectedEdgeKey", () => {
  it("orders ids consistently", () => {
    expect(undirectedEdgeKey(5, 2)).toBe("2-5")
    expect(undirectedEdgeKey(2, 5)).toBe("2-5")
  })
})

describe("buildPinLinkGeoJson", () => {
  const baseParams = {
    filter: CLEARED_FILTER,
    catalog: [] as CustomPinType[],
    focusPinId: null as number | null,
    backlinks: null as null,
    showConnections: true,
  }

  it("builds a line between two pins with linked_pins", () => {
    const a = minimalPin({
      id: 1,
      latitude: 51.5,
      longitude: -0.1,
      linked_pins: [{ pin_id: 2, source_field: null }],
    })
    const b = minimalPin({ id: 2, latitude: 51.51, longitude: -0.11 })

    const { featureCollection } = buildPinLinkGeoJson({ ...baseParams, pins: [a, b] })

    expect(featureCollection.features).toHaveLength(1)
    const feature = featureCollection.features[0]
    expect(feature.geometry.type).toBe("LineString")
    expect(feature.geometry.coordinates).toEqual([
      [-0.1, 51.5],
      [-0.11, 51.51],
    ])
    expect(feature.properties?.source_pin_id).toBe(1)
    expect(feature.properties?.target_pin_id).toBe(2)
    expect(feature.properties?.explicit).toBe(true)
  })

  it("skips targets not in the loaded pin set", () => {
    const a = minimalPin({
      id: 1,
      linked_pins: [{ pin_id: 99, source_field: null }],
    })

    const { featureCollection } = buildPinLinkGeoJson({ ...baseParams, pins: [a] })
    expect(featureCollection.features).toHaveLength(0)
  })

  it("respects pinMatchesFilter on both endpoints in global mode", () => {
    const oneTime = minimalPin({
      id: 1,
      pin_type: "one_time",
      linked_pins: [{ pin_id: 2, source_field: null }],
    })
    const scheduled = minimalPin({ id: 2, pin_type: "scheduled" })
    const filter = { ...CLEARED_FILTER, pinType: "scheduled" as const }

    const { featureCollection } = buildPinLinkGeoJson({
      ...baseParams,
      pins: [oneTime, scheduled],
      filter,
    })

    expect(featureCollection.features).toHaveLength(0)
  })

  it("includes backlink edges in focus mode with relaxed filter on the other endpoint", () => {
    const focus = minimalPin({
      id: 1,
      pin_type: "scheduled",
      latitude: 10,
      longitude: 20,
    })
    const source = minimalPin({
      id: 2,
      pin_type: "one_time",
      latitude: 11,
      longitude: 21,
    })
    const filter = { ...CLEARED_FILTER, pinType: "scheduled" as const }

    const { featureCollection } = buildPinLinkGeoJson({
      ...baseParams,
      pins: [focus, source],
      filter,
      focusPinId: 1,
      backlinks: [{ pin_id: 2, source_field: "description" }],
    })

    expect(featureCollection.features).toHaveLength(1)
    expect(featureCollection.features[0].properties?.explicit).toBe(false)
    expect(featureCollection.features[0].properties?.highlighted).toBe(true)
  })

  it("dedupes reciprocal pairs", () => {
    const a = minimalPin({
      id: 1,
      linked_pins: [{ pin_id: 2, source_field: null }],
    })
    const b = minimalPin({
      id: 2,
      linked_pins: [{ pin_id: 1, source_field: "description" }],
    })

    const { featureCollection } = buildPinLinkGeoJson({ ...baseParams, pins: [a, b] })
    expect(featureCollection.features).toHaveLength(1)
  })

  it("builds lines at low zoom levels", () => {
    const a = minimalPin({
      id: 1,
      linked_pins: [{ pin_id: 2, source_field: null }],
    })
    const b = minimalPin({ id: 2 })

    const { featureCollection } = buildPinLinkGeoJson({ ...baseParams, pins: [a, b] })
    expect(featureCollection.features).toHaveLength(1)
  })

  it("marks global mode as capped when edge count exceeds the limit", () => {
    const pins: Pin[] = []
    for (let i = 1; i <= 85; i++) {
      pins.push(
        minimalPin({
          id: i,
          latitude: i,
          longitude: i,
          linked_pins: [{ pin_id: i + 1, source_field: null }],
        }),
      )
    }
    pins.push(minimalPin({ id: 86, latitude: 86, longitude: 86 }))

    const result = buildPinLinkGeoJson({ ...baseParams, pins })
    expect(result.globalCapped).toBe(true)
    expect(result.featureCollection.features).toHaveLength(0)
  })

  it("returns empty when showConnections is false", () => {
    const a = minimalPin({
      id: 1,
      linked_pins: [{ pin_id: 2, source_field: null }],
    })
    const b = minimalPin({ id: 2 })

    const { featureCollection } = buildPinLinkGeoJson({
      ...baseParams,
      pins: [a, b],
      showConnections: false,
    })

    expect(featureCollection.features).toHaveLength(0)
  })
})
