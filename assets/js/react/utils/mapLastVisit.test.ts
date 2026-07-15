import { afterEach, describe, expect, it } from "vitest"
import type { Pin } from "../types"
import {
  clearLastVisitSessionCache,
  isPinNewSince,
  peekLastVisitStoredMs,
  resetLastVisitStorageForTests,
  takeLastVisitWatermark,
} from "./mapLastVisit"

function minimalPin(overrides: Partial<Pin> = {}): Pin {
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

describe("takeLastVisitWatermark", () => {
  const scope = "world"

  afterEach(() => {
    resetLastVisitStorageForTests()
  })

  it("returns null on first visit and stores now", () => {
    const now = 1_700_000_000_000
    expect(takeLastVisitWatermark(scope, now)).toBeNull()
    expect(peekLastVisitStoredMs(scope)).toBe(now)
  })

  it("returns previous watermark on return visit and advances storage", () => {
    const first = 1_700_000_000_000
    const second = 1_700_000_100_000
    takeLastVisitWatermark(scope, first)
    clearLastVisitSessionCache()
    const previous = takeLastVisitWatermark(scope, second)
    expect(previous?.getTime()).toBe(first)
    expect(peekLastVisitStoredMs(scope)).toBe(second)
  })

  it("is idempotent within the same page session", () => {
    const first = 1_700_000_000_000
    const second = 1_700_000_100_000
    expect(takeLastVisitWatermark(scope, first)).toBeNull()
    expect(takeLastVisitWatermark(scope, second)).toBeNull()
    expect(peekLastVisitStoredMs(scope)).toBe(first)
  })
})

describe("isPinNewSince", () => {
  const watermark = new Date("2025-06-01T12:00:00.000Z")

  it("is false when watermark is null", () => {
    expect(isPinNewSince(minimalPin({ updated_at: "2025-06-02T00:00:00.000Z" }), null)).toBe(false)
  })

  it("is false when updated_at is missing or unparseable", () => {
    expect(isPinNewSince(minimalPin({}), watermark)).toBe(false)
    expect(isPinNewSince(minimalPin({ updated_at: "not-a-date" }), watermark)).toBe(false)
  })

  it("is true when updated_at is after the watermark", () => {
    expect(isPinNewSince(minimalPin({ updated_at: "2025-06-02T00:00:00.000Z" }), watermark)).toBe(true)
  })

  it("is false when updated_at is at or before the watermark", () => {
    expect(isPinNewSince(minimalPin({ updated_at: "2025-06-01T12:00:00.000Z" }), watermark)).toBe(false)
    expect(isPinNewSince(minimalPin({ updated_at: "2025-05-31T00:00:00.000Z" }), watermark)).toBe(false)
  })
})
