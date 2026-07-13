import { describe, expect, it } from "vitest"
import { errorMessageFromResponse, parseApiErrorMessage } from "./apiErrors"

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

describe("errorMessageFromResponse", () => {
  it("returns field errors for 422", () => {
    const msg = errorMessageFromResponse(
      422,
      '{"errors":{"title":["is required"]}}'
    )
    expect(msg).toBe("is required")
  })

  it("returns generic message for 422 without parseable errors", () => {
    expect(errorMessageFromResponse(422, "")).toBe("Please check your input and try again.")
  })

  it("does not expose response body for non-422 errors", () => {
    expect(errorMessageFromResponse(500, '{"errors":{"detail":"database blew up"}}')).toBe(
      "Something went wrong. Please try again."
    )
  })

  it("returns generic 401 message", () => {
    expect(errorMessageFromResponse(401, '{"errors":{"detail":"invalid token"}}')).toBe(
      "Please sign in to continue."
    )
  })
})
