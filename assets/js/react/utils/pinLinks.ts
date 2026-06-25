import type { Pin, PinLink } from "../types"

export function explicitLinkedPinIds(pin: Pin): number[] {
  return (pin.linked_pins ?? [])
    .filter((link) => link.source_field == null)
    .map((link) => link.pin_id)
}

export function explicitPickerLinks(pinIds: number[]): PinLink[] {
  return pinIds.map((pin_id) => ({ pin_id, source_field: null }))
}
