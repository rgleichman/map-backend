import { describe, expect, it } from "vitest"
import { shouldShowPinHoverTooltip } from "./pinHoverVisibility"

describe("shouldShowPinHoverTooltip", () => {
  it("shows on desktop when nothing is selected", () => {
    expect(
      shouldShowPinHoverTooltip({
        isDesktop: true,
        hideMiniPopup: false,
        detailPinId: null,
        hoverPinId: 1,
      }),
    ).toBe(true)
  })

  it("hides on mobile", () => {
    expect(
      shouldShowPinHoverTooltip({
        isDesktop: false,
        hideMiniPopup: false,
        detailPinId: null,
        hoverPinId: 1,
      }),
    ).toBe(false)
  })

  it("hides during placement", () => {
    expect(
      shouldShowPinHoverTooltip({
        isDesktop: true,
        hideMiniPopup: true,
        detailPinId: null,
        hoverPinId: 1,
      }),
    ).toBe(false)
  })

  it("hides when hovering the selected pin", () => {
    expect(
      shouldShowPinHoverTooltip({
        isDesktop: true,
        hideMiniPopup: false,
        detailPinId: 42,
        hoverPinId: 42,
      }),
    ).toBe(false)
  })

  it("shows when hovering a different pin while another is selected", () => {
    expect(
      shouldShowPinHoverTooltip({
        isDesktop: true,
        hideMiniPopup: false,
        detailPinId: 42,
        hoverPinId: 7,
      }),
    ).toBe(true)
  })
})
