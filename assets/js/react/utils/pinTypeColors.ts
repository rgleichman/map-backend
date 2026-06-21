import type { PinType } from "../types"
import pinTypeColorsJson from "../../../shared/pin_type_colors.json"
import { DEFAULT_BUILTIN_PIN_TYPE } from "./builtinPinType"

export type PinTypeColorEntry = {
  label: string
  description: string
  color: string
  backgroundColor: string
  borderColor: string
  textColor: string
}

/** Canonical pin type colors — see assets/shared/pin_type_colors.json */
export const PIN_TYPE_COLORS: Record<PinType, PinTypeColorEntry> = pinTypeColorsJson as Record<
  PinType,
  PinTypeColorEntry
>

export function getPinTypeColorEntry(
  pinType: PinType | null | undefined
): PinTypeColorEntry {
  if (pinType != null && pinType in PIN_TYPE_COLORS) {
    return PIN_TYPE_COLORS[pinType]
  }
  return PIN_TYPE_COLORS[DEFAULT_BUILTIN_PIN_TYPE]
}
