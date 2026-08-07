import { describe, expect, it, vi } from "vitest"
import type { Pin } from "../types"
import {
  applyOwnedMarkerDeletedRefetch,
  refetchPinAfterMarkerDeleted,
  shouldRefetchOnMarkerDeleted,
} from "./markerDeleted"

function minimalPin(overrides: Partial<Pin> = {}): Pin {
  return {
    id: 1,
    title: "Pin",
    latitude: 0,
    longitude: 0,
    pin_type: "one_time",
    pin_type_id: 1,
    status: "approved",
    tags: [],
    ...overrides,
  }
}

describe("shouldRefetchOnMarkerDeleted", () => {
  it("is true only for pins in state with created_by_me", () => {
    const pins = [
      minimalPin({ id: 1, created_by_me: true }),
      minimalPin({ id: 2, created_by_me: false }),
    ]
    expect(shouldRefetchOnMarkerDeleted(pins, 1)).toBe(true)
    expect(shouldRefetchOnMarkerDeleted(pins, 2)).toBe(false)
    expect(shouldRefetchOnMarkerDeleted(pins, 99)).toBe(false)
  })
})

describe("applyOwnedMarkerDeletedRefetch", () => {
  const pins = [
    minimalPin({ id: 1, title: "Mine", status: "pending", created_by_me: true }),
    minimalPin({ id: 2, title: "Other" }),
  ]

  it("upserts on 200 with updated status", () => {
    const next = applyOwnedMarkerDeletedRefetch(pins, 1, {
      kind: "ok",
      pin: minimalPin({
        id: 1,
        title: "Mine",
        status: "rejected",
        created_by_me: true,
      }),
    })
    expect(next).toHaveLength(2)
    expect(next[0]).toMatchObject({ id: 1, status: "rejected", created_by_me: true })
  })

  it("removes on not_found", () => {
    const next = applyOwnedMarkerDeletedRefetch(pins, 1, { kind: "not_found" })
    expect(next.map((p) => p.id)).toEqual([2])
  })

  it("keeps pins on other errors", () => {
    const next = applyOwnedMarkerDeletedRefetch(pins, 1, { kind: "error" })
    expect(next).toEqual(pins)
  })
})

describe("refetchPinAfterMarkerDeleted", () => {
  it("returns ok with pin body on 200", async () => {
    const pin = minimalPin({ id: 5, status: "rejected", created_by_me: true })
    const fetchPin = vi.fn(async () =>
      new Response(JSON.stringify({ data: pin }), { status: 200 })
    )
    await expect(refetchPinAfterMarkerDeleted(5, fetchPin)).resolves.toEqual({
      kind: "ok",
      pin,
    })
  })

  it("returns not_found on 404", async () => {
    const fetchPin = vi.fn(async () => new Response("", { status: 404 }))
    await expect(refetchPinAfterMarkerDeleted(5, fetchPin)).resolves.toEqual({
      kind: "not_found",
    })
  })

  it("returns error on other HTTP failures", async () => {
    const fetchPin = vi.fn(async () => new Response("", { status: 500 }))
    await expect(refetchPinAfterMarkerDeleted(5, fetchPin)).resolves.toEqual({
      kind: "error",
    })
  })

  it("returns error when fetch throws", async () => {
    const fetchPin = vi.fn(async () => {
      throw new TypeError("network")
    })
    await expect(refetchPinAfterMarkerDeleted(5, fetchPin)).resolves.toEqual({
      kind: "error",
    })
  })
})
