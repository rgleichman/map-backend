import { describe, expect, it } from "vitest"
import type { Pin } from "../types"
import { linkedPinAddErrorMessage, validateLinkedPinAdd } from "./linkedPinValidation"

const approvedPin = (id: number, title = "Test"): Pin => ({
  id,
  title,
  latitude: 0,
  longitude: 0,
  pin_type: "other",
  status: "approved",
  tags: [],
})

describe("validateLinkedPinAdd", () => {
  it("rejects self link when editing", () => {
    const pin = approvedPin(5)
    expect(validateLinkedPinAdd(pin, { currentPinId: 5, linkedPinIds: [] })).toBe("self")
    expect(linkedPinAddErrorMessage("self")).toMatch(/itself/)
  })

  it("rejects duplicate links", () => {
    const pin = approvedPin(2)
    expect(validateLinkedPinAdd(pin, { linkedPinIds: [2] })).toBe("already_linked")
  })

  it("rejects when at max links", () => {
    const pin = approvedPin(99)
    const linkedPinIds = Array.from({ length: 10 }, (_, i) => i + 1)
    expect(validateLinkedPinAdd(pin, { linkedPinIds })).toBe("max_links")
  })

  it("rejects non-approved pins", () => {
    const pin = { ...approvedPin(3), status: "pending" as const }
    expect(validateLinkedPinAdd(pin, { linkedPinIds: [] })).toBe("unavailable")
  })

  it("accepts valid link", () => {
    const pin = approvedPin(7)
    expect(validateLinkedPinAdd(pin, { currentPinId: 1, linkedPinIds: [2] })).toBeNull()
  })
})
