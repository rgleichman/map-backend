import { describe, expect, it } from "vitest"
import { parseApiErrorMessage } from "./apiErrors"

describe("parseApiErrorMessage", () => {
  it("extracts field-specific errors", () => {
    const msg = parseApiErrorMessage(
      'HTTP 422: {"errors":{"linked_pin_ids":["cannot link a pin to itself"]}}',
      "linked_pin_ids"
    )
    expect(msg).toBe("cannot link a pin to itself")
  })

  it("falls back to first error field", () => {
    const msg = parseApiErrorMessage('HTTP 422: {"errors":{"title":["is required"]}}')
    expect(msg).toBe("is required")
  })
})
