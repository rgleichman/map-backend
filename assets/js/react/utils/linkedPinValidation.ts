import type { Pin } from "../types"

export const MAX_EXPLICIT_LINKED_PINS = 10

type LinkedPinAddError =
  | "self"
  | "already_linked"
  | "max_links"
  | "unavailable"

const LINKED_PIN_ERROR_MESSAGES: Record<LinkedPinAddError, string> = {
  self: "You can't link a pin to itself.",
  already_linked: "That pin is already linked.",
  max_links: `You can link up to ${MAX_EXPLICIT_LINKED_PINS} pins.`,
  unavailable: "That pin isn't available to link.",
}

export function linkedPinAddErrorMessage(error: LinkedPinAddError): string {
  return LINKED_PIN_ERROR_MESSAGES[error]
}

export function validateLinkedPinAdd(
  pin: Pin,
  opts: {
    currentPinId?: number | null
    linkedPinIds: number[]
  }
): LinkedPinAddError | null {
  if (opts.currentPinId != null && pin.id === opts.currentPinId) return "self"
  if (opts.linkedPinIds.includes(pin.id)) return "already_linked"
  if (opts.linkedPinIds.length >= MAX_EXPLICIT_LINKED_PINS) return "max_links"
  if (pin.status !== "approved") return "unavailable"
  return null
}
