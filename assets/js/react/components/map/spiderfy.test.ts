import { describe, expect, it } from "vitest"
import {
  assignPinsToSpiderSlots,
  buildSpiderfySyncKey,
  circularAngleDelta,
  clusterFilterExcludingIds,
  minCostAssignment,
  shouldSpiderfyCluster,
  spiderfyLeavesToFeatures,
  spiderfyOffsets,
  spiderfySlotAngles,
  SPIDERFY_MAX_COUNT,
  SPIDERFY_MIN_ZOOM,
  SPIDERFY_PIXEL_RADIUS,
  suppressOverlappingSpiderLabels,
  type SpiderLeafFeature,
} from "./spiderfy"

describe("shouldSpiderfyCluster", () => {
  it("requires min zoom and a small multi-pin group", () => {
    expect(shouldSpiderfyCluster({ zoom: SPIDERFY_MIN_ZOOM, pointCount: 3 })).toBe(true)
    expect(shouldSpiderfyCluster({ zoom: SPIDERFY_MIN_ZOOM - 0.1, pointCount: 3 })).toBe(false)
    expect(shouldSpiderfyCluster({ zoom: SPIDERFY_MIN_ZOOM, pointCount: 1 })).toBe(false)
    expect(shouldSpiderfyCluster({ zoom: SPIDERFY_MIN_ZOOM, pointCount: SPIDERFY_MAX_COUNT })).toBe(
      true,
    )
    expect(
      shouldSpiderfyCluster({ zoom: SPIDERFY_MIN_ZOOM, pointCount: SPIDERFY_MAX_COUNT + 1 }),
    ).toBe(false)
  })
})

describe("spiderfyOffsets", () => {
  it("returns empty for zero count", () => {
    expect(spiderfyOffsets(0)).toEqual([])
  })

  it("centers a single leaf", () => {
    expect(spiderfyOffsets(1, 60)).toEqual([{ x: 0, y: 0 }])
  })

  it("places two leaves opposite each other starting at the top", () => {
    const [a, b] = spiderfyOffsets(2, 60)
    expect(a.x).toBeCloseTo(0)
    expect(a.y).toBeCloseTo(-60)
    expect(b.x).toBeCloseTo(0)
    expect(b.y).toBeCloseTo(60)
  })

  it("spaces N leaves evenly on a circle of the given radius", () => {
    const offsets = spiderfyOffsets(4, SPIDERFY_PIXEL_RADIUS)
    expect(offsets).toHaveLength(4)
    for (const o of offsets) {
      expect(Math.hypot(o.x, o.y)).toBeCloseTo(SPIDERFY_PIXEL_RADIUS)
    }
  })
})

describe("clusterFilterExcludingIds", () => {
  it("shows all clusters when nothing is spiderfied", () => {
    expect(clusterFilterExcludingIds([])).toEqual(["has", "point_count"])
  })

  it("excludes the given cluster ids", () => {
    expect(clusterFilterExcludingIds([7, 3])).toEqual([
      "all",
      ["has", "point_count"],
      ["!", ["in", ["get", "cluster_id"], ["literal", [7, 3]]]],
    ])
  })
})

describe("buildSpiderfySyncKey", () => {
  it("is stable for the same logical inputs regardless of id order", () => {
    const center = { lng: -122.4194, lat: 37.7749 }
    const a = buildSpiderfySyncKey([2, 1], 13.25, center, 9)
    const b = buildSpiderfySyncKey([1, 2], 13.25, center, 9)
    expect(a).toBe(b)
  })

  it("changes when selection or zoom changes", () => {
    const center = { lng: 0, lat: 0 }
    const base = buildSpiderfySyncKey([1], 13, center, null)
    expect(buildSpiderfySyncKey([1], 13, center, 5)).not.toBe(base)
    expect(buildSpiderfySyncKey([1], 14, center, null)).not.toBe(base)
  })
})

describe("circularAngleDelta", () => {
  it("returns the smallest wrap-around distance", () => {
    expect(circularAngleDelta(0, 0)).toBeCloseTo(0)
    expect(circularAngleDelta(-Math.PI / 2, Math.PI / 2)).toBeCloseTo(Math.PI)
    expect(circularAngleDelta(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2)
  })
})

describe("minCostAssignment", () => {
  it("returns an empty assignment for an empty matrix", () => {
    expect(minCostAssignment([])).toEqual([])
  })

  it("solves a classic permutation cost matrix optimally", () => {
    // Prefer diagonal, but force a swap via costs.
    const cost = [
      [4, 1, 3],
      [2, 0, 5],
      [3, 2, 2],
    ]
    const assignment = minCostAssignment(cost)
    expect(new Set(assignment).size).toBe(3)
    const total = assignment.reduce((sum, col, row) => sum + cost[row][col], 0)
    expect(total).toBe(5) // 1+2+2 via cols [1,0,2]
    expect(assignment).toEqual([1, 0, 2])
  })
})

describe("assignPinsToSpiderSlots", () => {
  it("maps east/west/north/south pins onto matching ring slots", () => {
    // Slot order for 4: top, right, bottom, left (screen y grows downward).
    const angles = spiderfySlotAngles(4)
    expect(angles[0]).toBeCloseTo(-Math.PI / 2)
    expect(angles[1]).toBeCloseTo(0)
    expect(angles[2]).toBeCloseTo(Math.PI / 2)
    expect(angles[3]).toBeCloseTo(Math.PI)

    // Deliberately unordered: right, left, bottom, top.
    const assignment = assignPinsToSpiderSlots([
      { x: 10, y: 0 },
      { x: -10, y: 0 },
      { x: 0, y: 10 },
      { x: 0, y: -10 },
    ])
    expect(assignment).toEqual([1, 3, 2, 0])
  })

  it("gives center pins any free slot without breaking uniqueness", () => {
    const assignment = assignPinsToSpiderSlots([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ])
    expect(new Set(assignment)).toEqual(new Set([0, 1]))
  })
})

describe("spiderfyLeavesToFeatures", () => {
  const project = (lng: number, lat: number) => ({ x: lng * 100, y: lat * 100 })
  const unproject = (x: number, y: number) => ({ lng: x / 100, lat: y / 100 })

  function leafProps(id: number, title: string, extra?: Record<string, unknown>) {
    return {
      pin_id: id,
      title,
      pin_type: "other",
      pin_type_icon: `icon-${id}`,
      haloColor: "#fff",
      haloWidth: 1,
      isNew: false,
      isSelected: false,
      ...extra,
    }
  }

  it("offsets leaves around the cluster center and builds legs", () => {
    const leaves = [
      {
        geometry: { type: "Point", coordinates: [10, 20] },
        properties: leafProps(1, "A"),
      },
      {
        geometry: { type: "Point", coordinates: [10.001, 20.001] },
        properties: leafProps(2, "B", { isNew: true, isSelected: true, haloColor: "#eee" }),
      },
    ]

    const result = spiderfyLeavesToFeatures(leaves, [10, 20], 42, project, unproject, 50)
    expect(result.leaves).toHaveLength(2)
    expect(result.legs).toHaveLength(2)
    expect(result.leaves[0].properties.cluster_id).toBe(42)
    expect(result.leaves[0].properties.true_longitude).toBe(10)
    expect(result.leaves[0].properties.true_latitude).toBe(20)
    expect(result.legs[0].geometry.coordinates[0]).toEqual(
      result.leaves[0].geometry.coordinates,
    )
    expect(result.legs[0].geometry.coordinates[1]).toEqual([10, 20])
    expect(result.legs[1].geometry.coordinates[1]).toEqual([10.001, 20.001])
  })

  it("places each pin on the ring slot closest to its true bearing", () => {
    // Center at origin in projected space. Four pins at cardinal directions.
    const leaves = [
      { geometry: { type: "Point", coordinates: [1, 0] }, properties: leafProps(1, "E") },
      { geometry: { type: "Point", coordinates: [0, 1] }, properties: leafProps(2, "S") },
      { geometry: { type: "Point", coordinates: [-1, 0] }, properties: leafProps(3, "W") },
      { geometry: { type: "Point", coordinates: [0, -1] }, properties: leafProps(4, "N") },
    ]

    const result = spiderfyLeavesToFeatures(leaves, [0, 0], 1, project, unproject, 50)
    const byId = new Map(result.leaves.map((f) => [f.properties.pin_id, f.geometry.coordinates]))

    // project/unproject scale by 100; radius 50px → 0.5 in lng/lat units.
    expect(byId.get(4)?.[0]).toBeCloseTo(0) // north → top
    expect(byId.get(4)?.[1]).toBeCloseTo(-0.5)
    expect(byId.get(1)?.[0]).toBeCloseTo(0.5) // east → right
    expect(byId.get(1)?.[1]).toBeCloseTo(0)
    expect(byId.get(2)?.[0]).toBeCloseTo(0) // south → bottom
    expect(byId.get(2)?.[1]).toBeCloseTo(0.5)
    expect(byId.get(3)?.[0]).toBeCloseTo(-0.5) // west → left
    expect(byId.get(3)?.[1]).toBeCloseTo(0)
  })
})

describe("suppressOverlappingSpiderLabels", () => {
  function leaf(
    id: number,
    title: string,
    coords: [number, number],
  ): SpiderLeafFeature {
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: coords },
      properties: {
        pin_id: id,
        title,
        pin_type: "other",
        pin_type_icon: "icon",
        haloColor: "#fff",
        haloWidth: 1,
        isNew: false,
        isSelected: id === 1,
        true_longitude: coords[0],
        true_latitude: coords[1],
        cluster_id: 1,
      },
    }
  }

  it("blanks nearby non-selected titles", () => {
    const project = (lng: number, lat: number) => ({ x: lng, y: lat })
    const result = suppressOverlappingSpiderLabels(
      [leaf(1, "Selected", [0, 0]), leaf(2, "Near", [10, 5]), leaf(3, "Far", [500, 500])],
      1,
      project,
      100,
      36,
    )
    expect(result[0].properties.title).toBe("Selected")
    expect(result[1].properties.title).toBe("")
    expect(result[2].properties.title).toBe("Far")
  })
})
