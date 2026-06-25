import { describe, expect, it } from "vitest"
import type { Pin, PinLink } from "./types"

/**
 * Representative pin link payloads from PinJSON.
 * Keep keys in sync with StorymapWeb.PinJSON (lib/storymap_web/controllers/pin_json.ex).
 */
const wirePinLink: PinLink = {
  pin_id: 42,
  source_field: "description",
}

const wireExplicitLink: PinLink = {
  pin_id: 99,
  source_field: null,
}

const wirePin: Pin = {
  id: 1,
  title: "Example",
  latitude: 0,
  longitude: 0,
  pin_type: "other",
  status: "approved",
  tags: [],
  linked_pins: [wireExplicitLink, wirePinLink],
}

describe("Pin link API contract", () => {
  it("uses slim PinLink wire shape with pin_id and optional source_field", () => {
    expect(wirePinLink.pin_id).toBe(42)
    expect(wirePinLink.source_field).toBe("description")
    expect(wireExplicitLink.source_field).toBeNull()
    expect(wirePinLink).not.toHaveProperty("title")
    expect(wirePinLink).not.toHaveProperty("pin_type")
  })

  it("includes linked_pins on Pin responses", () => {
    expect(wirePin.linked_pins).toHaveLength(2)
    expect(wirePin.linked_pins?.[0]?.pin_id).toBe(99)
  })
})
