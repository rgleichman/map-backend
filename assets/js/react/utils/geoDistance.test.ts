import { describe, expect, it } from "vitest"
import { haversineMeters, isPinNearUserLocation, NEAR_USER_PIN_THRESHOLD_M } from "./geoDistance"

describe("haversineMeters", () => {
  it("returns 0 for identical points", () => {
    expect(haversineMeters(37.7749, -122.4194, 37.7749, -122.4194)).toBe(0)
  })

  it("is roughly 1 degree of latitude (~111 km)", () => {
    const meters = haversineMeters(0, 0, 1, 0)
    expect(meters).toBeGreaterThan(110_000)
    expect(meters).toBeLessThan(112_000)
  })

  it("matches a known short urban distance within a few meters", () => {
    // ~111 m north of origin at equator
    const meters = haversineMeters(0, 0, 0.001, 0)
    expect(meters).toBeGreaterThan(110)
    expect(meters).toBeLessThan(112)
  })
})

describe("isPinNearUserLocation", () => {
  it("uses the default 250 m threshold", () => {
    expect(NEAR_USER_PIN_THRESHOLD_M).toBe(250)
    expect(isPinNearUserLocation(0, 0, 0, 0)).toBe(true)
    // ~222 m north
    expect(isPinNearUserLocation(0, 0, 0.002, 0)).toBe(true)
    // ~333 m north
    expect(isPinNearUserLocation(0, 0, 0.003, 0)).toBe(false)
  })

  it("respects a custom threshold", () => {
    expect(isPinNearUserLocation(0, 0, 0.003, 0, 400)).toBe(true)
    expect(isPinNearUserLocation(0, 0, 0.003, 0, 300)).toBe(false)
  })
})
