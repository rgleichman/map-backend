import { describe, expect, it } from "vitest"
import type { Pin } from "../types"
import { mergePin, normalizePinForInsert, upsertPinIntoList } from "./pinMerge"

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

describe("normalizePinForInsert", () => {
  it("keeps is_owner and created_by_me from create HTTP", () => {
    const pin = normalizePinForInsert(
      minimalPin({ is_owner: true, created_by_me: true })
    )
    expect(pin.is_owner).toBe(true)
    expect(pin.created_by_me).toBe(true)
  })

  it("defaults omitted viewer fields to false (channel payload)", () => {
    const pin = normalizePinForInsert(minimalPin({ title: "Remote" }))
    expect(pin.is_owner).toBe(false)
    expect(pin.created_by_me).toBe(false)
  })
})

describe("mergePin", () => {
  it("preserves existing viewer flags when channel omits them", () => {
    const existing = minimalPin({
      title: "Old",
      is_owner: true,
      created_by_me: true,
      inserted_at: "2026-01-01T00:00:00",
      updated_at: "2026-01-01T00:00:00",
    })
    const incoming = minimalPin({ title: "New" })
    expect(mergePin(existing, incoming)).toMatchObject({
      title: "New",
      is_owner: true,
      created_by_me: true,
      inserted_at: "2026-01-01T00:00:00",
      updated_at: "2026-01-01T00:00:00",
    })
  })

  it("applies viewer flags when HTTP provides them", () => {
    const existing = minimalPin({ is_owner: false, created_by_me: false })
    const incoming = minimalPin({ is_owner: true, created_by_me: true })
    expect(mergePin(existing, incoming)).toMatchObject({
      is_owner: true,
      created_by_me: true,
    })
  })
})

describe("upsertPinIntoList", () => {
  it("insert from create keeps ownership true", () => {
    const next = upsertPinIntoList(
      [],
      minimalPin({ id: 5, is_owner: true, created_by_me: true })
    )
    expect(next).toHaveLength(1)
    expect(next[0].is_owner).toBe(true)
    expect(next[0].created_by_me).toBe(true)
  })

  it("insert from channel defaults ownership to false", () => {
    const next = upsertPinIntoList([], minimalPin({ id: 6, title: "Broadcast" }))
    expect(next[0].is_owner).toBe(false)
    expect(next[0].created_by_me).toBe(false)
  })

  it("update from channel preserves existing ownership", () => {
    const existing = [
      minimalPin({ id: 7, title: "Mine", is_owner: true, created_by_me: true }),
    ]
    const next = upsertPinIntoList(existing, minimalPin({ id: 7, title: "Updated" }))
    expect(next[0]).toMatchObject({
      title: "Updated",
      is_owner: true,
      created_by_me: true,
    })
  })

  it("update from HTTP can set ownership flags", () => {
    const existing = [minimalPin({ id: 8, is_owner: false, created_by_me: false })]
    const next = upsertPinIntoList(
      existing,
      minimalPin({ id: 8, is_owner: true, created_by_me: true })
    )
    expect(next[0]).toMatchObject({ is_owner: true, created_by_me: true })
  })
})
