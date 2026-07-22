import { describe, expect, it } from "vitest"
import type { CustomPinType, Pin } from "../../types"
import {
  CLEARED_FILTER,
  DEFAULT_FILTER,
  TIME_FILTER_NOW,
  createPinFilterMatcher,
  buildMapFilterSyncKey,
} from "./filters"
import {
  buildPinFeatureSets,
  buildPinGeoJsonSyncKey,
  desaturateHex,
  PIN_LABEL_HALO_WIDTH,
  PIN_LABEL_SELECTED_HALO_WIDTH,
  suppressOverlappingPinLabels,
  toPinFeature,
  truncateTitle,
  type PinPointFeature,
} from "./mapPinFeatures"
import { SELECTED_PIN_OUTLINE_STROKE } from "../../utils/pinTypeIcons"

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

describe("truncateTitle", () => {
  it("trims whitespace and leaves short titles unchanged", () => {
    expect(truncateTitle("  Hello  ")).toBe("Hello")
  })

  it("truncates long titles with an ellipsis", () => {
    const long = "A".repeat(30)
    expect(truncateTitle(long)).toHaveLength(22)
    expect(truncateTitle(long).endsWith("…")).toBe(true)
  })
})

describe("desaturateHex", () => {
  it("blends toward white", () => {
    expect(desaturateHex("#000000")).toBe("#d9d9d9")
    expect(desaturateHex("#ff0000", 0.5)).toBe("#ff8080")
  })
})

describe("toPinFeature", () => {
  it("maps pin fields to GeoJSON feature properties", () => {
    const pin = minimalPin({
      id: 42,
      title: "Coffee Shop",
      latitude: 51.5,
      longitude: -0.1,
      pin_type: "scheduled",
    })
    const feature = toPinFeature(pin, [])

    expect(feature.type).toBe("Feature")
    expect(feature.geometry).toEqual({ type: "Point", coordinates: [-0.1, 51.5] })
    expect(feature.properties.pin_id).toBe(42)
    expect(feature.properties.title).toBe("Coffee Shop")
    expect(feature.properties.pin_type).toBe("scheduled")
    expect(feature.properties.pin_type_icon).toBe("pin-icon-scheduled")
    expect(feature.properties.haloColor).toMatch(/^#[0-9a-f]{6}$/i)
    expect(feature.properties.haloWidth).toBe(PIN_LABEL_HALO_WIDTH)
    expect(feature.properties.isNew).toBe(false)
    expect(feature.properties.isSelected).toBe(false)
  })

  it("sets isNew and outlined icon when updated_at is after the last-visit watermark", () => {
    const pin = minimalPin({
      pin_type: "scheduled",
      updated_at: "2025-06-02T00:00:00.000Z",
    })
    const watermark = new Date("2025-06-01T12:00:00.000Z")
    const feature = toPinFeature(pin, [], watermark)
    expect(feature.properties.isNew).toBe(true)
    expect(feature.properties.pin_type_icon).toBe("pin-icon-scheduled-new")
    expect(toPinFeature(pin, [], null).properties.pin_type_icon).toBe("pin-icon-scheduled")
  })

  it("highlights the selected pin with primary outline, full title, and thicker halo", () => {
    const long = "A very long pin title that exceeds the map label limit"
    const pin = minimalPin({
      id: 7,
      title: long,
      pin_type: "scheduled",
      updated_at: "2025-06-02T00:00:00.000Z",
    })
    const watermark = new Date("2025-06-01T12:00:00.000Z")
    const feature = toPinFeature(pin, [], watermark, 7)

    expect(feature.properties.isSelected).toBe(true)
    expect(feature.properties.isNew).toBe(true)
    expect(feature.properties.pin_type_icon).toBe("pin-icon-scheduled-selected")
    expect(feature.properties.title).toBe(long.trim())
    expect(feature.properties.haloWidth).toBe(PIN_LABEL_SELECTED_HALO_WIDTH)
    expect(feature.properties.haloColor).toBe(SELECTED_PIN_OUTLINE_STROKE)
  })

  it("still truncates titles when the pin is not selected", () => {
    const long = "A".repeat(30)
    const pin = minimalPin({ id: 1, title: long })
    expect(toPinFeature(pin, [], null, 99).properties.title).toHaveLength(22)
  })
})

describe("buildPinFeatureSets", () => {
  const oneTime = minimalPin({ id: 1, pin_type: "one_time" })
  const scheduled = minimalPin({ id: 2, pin_type: "scheduled" })

  it("splits pins into matching and dimmed by filter", () => {
    const filter = { ...CLEARED_FILTER, pinType: "scheduled" as const }
    const pinMatches = createPinFilterMatcher([oneTime, scheduled], filter, [])
    const { matching, dimmed } = buildPinFeatureSets([oneTime, scheduled], pinMatches, [])

    expect(matching).toHaveLength(1)
    expect(matching[0].properties.pin_id).toBe(2)
    expect(dimmed).toHaveLength(1)
    expect(dimmed[0].properties.pin_id).toBe(1)
  })
})

describe("buildPinGeoJsonSyncKey", () => {
  const pin = minimalPin({ id: 1, title: "A", latitude: 1, longitude: 2 })
  const catalog: CustomPinType[] = []
  const clearedKey = buildMapFilterSyncKey(CLEARED_FILTER)
  const defaultKey = buildMapFilterSyncKey(DEFAULT_FILTER)

  it("is stable when inputs are unchanged", () => {
    const key1 = buildPinGeoJsonSyncKey([pin], defaultKey, catalog)
    const key2 = buildPinGeoJsonSyncKey([pin], defaultKey, catalog)
    expect(key1).toBe(key2)
  })

  it("changes when pins change", () => {
    const key1 = buildPinGeoJsonSyncKey([pin], clearedKey, catalog)
    const key2 = buildPinGeoJsonSyncKey(
      [minimalPin({ id: 2, title: "B", latitude: 3, longitude: 4 })],
      clearedKey,
      catalog,
    )
    expect(key1).not.toBe(key2)
  })

  it("changes when filter changes", () => {
    const activeKey = buildMapFilterSyncKey({ ...DEFAULT_FILTER, time: TIME_FILTER_NOW })
    const key1 = buildPinGeoJsonSyncKey([pin], clearedKey, catalog)
    const key2 = buildPinGeoJsonSyncKey([pin], activeKey, catalog)
    expect(key1).not.toBe(key2)
  })

  it("changes when catalog visual fields change", () => {
    const customType: CustomPinType = {
      id: 10,
      slug: "cafe",
      label: "Cafe",
      description: "",
      marker_color: "#112233",
      icon: null,
      schema: { fields: [] },
      pin_type: "custom:cafe",
      enabled: true,
    }
    const key1 = buildPinGeoJsonSyncKey([pin], clearedKey, [])
    const key2 = buildPinGeoJsonSyncKey([pin], clearedKey, [customType])
    const key3 = buildPinGeoJsonSyncKey(
      [pin],
      clearedKey,
      [{ ...customType, marker_color: "#445566" }],
    )
    expect(key1).not.toBe(key2)
    expect(key2).not.toBe(key3)
  })

  it("changes when last-visit watermark changes", () => {
    const key1 = buildPinGeoJsonSyncKey([pin], clearedKey, catalog, null)
    const key2 = buildPinGeoJsonSyncKey([pin], clearedKey, catalog, 1_700_000_000_000)
    expect(key1).not.toBe(key2)
  })

  it("changes when selected pin changes", () => {
    const key1 = buildPinGeoJsonSyncKey([pin], clearedKey, catalog, null, null)
    const key2 = buildPinGeoJsonSyncKey([pin], clearedKey, catalog, null, 1)
    expect(key1).not.toBe(key2)
  })
})

describe("suppressOverlappingPinLabels", () => {
  function featureAt(id: number, lng: number, lat: number, title: string): PinPointFeature {
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        pin_id: id,
        title,
        pin_type: "one_time",
        pin_type_icon: "pin-icon-one_time",
        haloColor: "#ccc",
        haloWidth: 1.7,
        isNew: false,
        isSelected: id === 1,
      },
    }
  }

  it("leaves titles alone when nothing is selected", () => {
    const features = [featureAt(1, 0, 0, "A"), featureAt(2, 0.001, 0, "B")]
    const out = suppressOverlappingPinLabels(features, null, (lng, lat) => ({
      x: lng * 1000,
      y: lat * 1000,
    }))
    expect(out.map((f) => f.properties.title)).toEqual(["A", "B"])
  })

  it("clears titles that project near the selected pin", () => {
    const features = [featureAt(1, 0, 0, "Selected"), featureAt(2, 0.01, 0, "Near")]
    const out = suppressOverlappingPinLabels(features, 1, (lng, lat) => ({
      x: lng * 1000,
      y: lat * 1000,
    }))
    expect(out[0].properties.title).toBe("Selected")
    expect(out[1].properties.title).toBe("")
  })

  it("keeps distant titles", () => {
    const features = [featureAt(1, 0, 0, "Selected"), featureAt(2, 1, 1, "Far")]
    const out = suppressOverlappingPinLabels(features, 1, (lng, lat) => ({
      x: lng * 1000,
      y: lat * 1000,
    }))
    expect(out[1].properties.title).toBe("Far")
  })
})
