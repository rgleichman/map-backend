import type { BuiltinPinType as BuiltinPinTypeName, PinType } from "../types"

/** Built-in pin type wire values; match backend `pin_type` for non-custom pins. */
export const BuiltinPinType = {
  OneTime: "one_time",
  Scheduled: "scheduled",
  FoodBank: "food_bank",
  Other: "other",
} as const satisfies Record<string, BuiltinPinTypeName>

export const BUILTIN_PIN_TYPES: BuiltinPinTypeName[] = Object.values(BuiltinPinType)

export const DEFAULT_BUILTIN_PIN_TYPE = BuiltinPinType.OneTime

export const CUSTOM_PIN_TYPE_PREFIX = "custom:" as const

export function isBuiltinPinType(pinType: string): pinType is BuiltinPinTypeName {
  return (BUILTIN_PIN_TYPES as string[]).includes(pinType)
}

export function isCustomPinType(pinType: string): pinType is `custom:${string}` {
  return pinType.startsWith(CUSTOM_PIN_TYPE_PREFIX)
}

export function isTimeOnlyBuiltinPinType(pinType: PinType | string): boolean {
  return pinType === BuiltinPinType.Scheduled || pinType === BuiltinPinType.FoodBank
}

export function skipBuiltinTimeValidation(
  pinType: PinType | string,
  options: { isCustom: boolean; open24_7: boolean }
): boolean {
  return (
    pinType === BuiltinPinType.Other ||
    options.isCustom ||
    (pinType === BuiltinPinType.FoodBank && options.open24_7)
  )
}

/** Builtin icon key for map markers and filter chips (custom types use Other). */
export function builtinIconKeyForPinType(
  pinType: PinType | string | null | undefined
): BuiltinPinTypeName {
  if (pinType && isBuiltinPinType(pinType)) return pinType
  if (typeof pinType === "string" && isCustomPinType(pinType)) return BuiltinPinType.Other
  return DEFAULT_BUILTIN_PIN_TYPE
}

/** MapLibre image id for a custom pin type marker (e.g. `custom:foo` → `pin-icon-custom-foo`). */
export function customPinTypeMarkerImageId(pinType: `custom:${string}`): string {
  return `pin-icon-custom-${pinType.slice(CUSTOM_PIN_TYPE_PREFIX.length)}`
}
