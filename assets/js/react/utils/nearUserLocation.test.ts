import { afterEach, describe, expect, it } from "vitest"
import {
  cacheDeviceLocation,
  clearCachedDeviceLocation,
  isPinNearDeviceLocation,
} from "./nearUserLocation"

afterEach(() => {
  clearCachedDeviceLocation()
})

describe("isPinNearDeviceLocation", () => {
  it("returns false when nothing is cached", () => {
    expect(isPinNearDeviceLocation(0, 0)).toBe(false)
  })

  it("returns true when the pin is within the cached fix", () => {
    cacheDeviceLocation({ latitude: 0, longitude: 0, accuracy: 20 })
    // ~111 m north
    expect(isPinNearDeviceLocation(0.001, 0)).toBe(true)
  })

  it("returns false when the pin is outside the threshold", () => {
    cacheDeviceLocation({ latitude: 0, longitude: 0, accuracy: 20 })
    // ~333 m north
    expect(isPinNearDeviceLocation(0.003, 0)).toBe(false)
  })

  it("returns false when cached accuracy is too poor", () => {
    cacheDeviceLocation({ latitude: 0, longitude: 0, accuracy: 1001 })
    expect(isPinNearDeviceLocation(0, 0)).toBe(false)
  })
})
