import { afterEach, describe, expect, it, vi } from "vitest"
import type maplibregl from "maplibre-gl"
import {
  CLUSTER_EXPANSION_DURATION_MS,
  type ClusterExpansionMap,
  expandClusterAtPoint,
  type InteractiveMapFeature,
  pinIdFromTopFeatureAt,
  topInteractiveFeatureAt,
} from "./clusterInteraction"

function clusterFeature(
  clusterId = 42,
  coords: [number, number] = [-122.4, 37.8],
  layerId: "pin-clusters-layer" | "pin-cluster-count-layer" = "pin-clusters-layer",
): InteractiveMapFeature {
  return {
    geometry: { type: "Point", coordinates: coords },
    properties: { cluster_id: clusterId, point_count: 5 },
    layer: { id: layerId },
  }
}

function pinFeature(
  pinId = 7,
  layerId: "pin-icons-layer" | "pin-icons-dimmed-layer" = "pin-icons-dimmed-layer",
): InteractiveMapFeature {
  return {
    geometry: { type: "Point", coordinates: [-122.41, 37.81] },
    properties: { pin_id: pinId },
    layer: { id: layerId },
  }
}

function mockMap(features: InteractiveMapFeature[]) {
  return {
    queryRenderedFeatures: vi.fn(() => features),
    easeTo: vi.fn(),
  } as unknown as ClusterExpansionMap
}

const clickPoint = { x: 0, y: 0 } as maplibregl.PointLike

describe("topInteractiveFeatureAt", () => {
  it("returns the first queried feature", () => {
    const cluster = clusterFeature()
    const map = mockMap([cluster, pinFeature()])
    expect(topInteractiveFeatureAt(map, clickPoint)).toBe(cluster)
  })
})

describe("pinIdFromTopFeatureAt", () => {
  it("returns null when a cluster is on top", () => {
    const map = mockMap([clusterFeature(), pinFeature()])
    expect(pinIdFromTopFeatureAt(map, clickPoint)).toBeNull()
  })

  it("returns the pin id when a pin is on top", () => {
    const map = mockMap([pinFeature(99)])
    expect(pinIdFromTopFeatureAt(map, clickPoint)).toBe(99)
  })
})

describe("expandClusterAtPoint", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("eases to the cluster center at the expansion zoom", async () => {
    const coords: [number, number] = [-122.4, 37.8]
    const map = mockMap([clusterFeature(42, coords)])
    const source = {
      getClusterExpansionZoom: vi.fn().mockResolvedValue(13),
    }

    const handled = await expandClusterAtPoint(map, clickPoint, source)

    expect(handled).toBe(true)
    expect(source.getClusterExpansionZoom).toHaveBeenCalledWith(42)
    expect(map.easeTo).toHaveBeenCalledWith({
      center: coords,
      zoom: 13,
      duration: CLUSTER_EXPANSION_DURATION_MS,
    })
  })

  it("works when the top feature is the cluster count layer", async () => {
    const map = mockMap([clusterFeature(7, [-1, 2], "pin-cluster-count-layer")])
    const source = { getClusterExpansionZoom: vi.fn().mockResolvedValue(11) }

    await expandClusterAtPoint(map, clickPoint, source)

    expect(source.getClusterExpansionZoom).toHaveBeenCalledWith(7)
    expect(map.easeTo).toHaveBeenCalled()
  })

  it("returns false when the top feature is a pin", async () => {
    const map = mockMap([pinFeature()])
    const source = { getClusterExpansionZoom: vi.fn() }

    const handled = await expandClusterAtPoint(map, clickPoint, source)

    expect(handled).toBe(false)
    expect(source.getClusterExpansionZoom).not.toHaveBeenCalled()
    expect(map.easeTo).not.toHaveBeenCalled()
  })

  it("does not ease when cluster_id is missing", async () => {
    const feature = clusterFeature()
    feature.properties = { point_count: 3 }
    const map = mockMap([feature])
    const source = { getClusterExpansionZoom: vi.fn() }

    const handled = await expandClusterAtPoint(map, clickPoint, source)

    expect(handled).toBe(true)
    expect(source.getClusterExpansionZoom).not.toHaveBeenCalled()
    expect(map.easeTo).not.toHaveBeenCalled()
  })

  it("swallows getClusterExpansionZoom failures", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => { })
    const map = mockMap([clusterFeature()])
    const source = {
      getClusterExpansionZoom: vi.fn().mockRejectedValue(new Error("cluster gone")),
    }

    await expect(expandClusterAtPoint(map, clickPoint, source)).resolves.toBe(true)

    expect(map.easeTo).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalled()
  })
})
