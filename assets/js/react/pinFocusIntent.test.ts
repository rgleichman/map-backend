import { describe, expect, it } from "vitest"
import { shouldApplyFocusIntent } from "./pinFocusIntent"

describe("shouldApplyFocusIntent", () => {
  const intent = { pinId: 1, token: 2 }

  it("applies a new intent when the pin is loaded", () => {
    expect(shouldApplyFocusIntent(intent, 0, false, true)).toBe(true)
  })

  it("does not re-apply the same token (URL sync must not flip selection)", () => {
    expect(shouldApplyFocusIntent(intent, 2, false, true)).toBe(false)
  })

  it("waits until loading finishes and the pin exists", () => {
    expect(shouldApplyFocusIntent(intent, 0, true, true)).toBe(false)
    expect(shouldApplyFocusIntent(intent, 0, false, false)).toBe(false)
  })

  it("applies a newer token for the same pin (repeat navigate)", () => {
    expect(shouldApplyFocusIntent({ pinId: 1, token: 3 }, 2, false, true)).toBe(true)
  })
})
