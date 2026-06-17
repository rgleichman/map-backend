import type { BuiltinPinType, CustomFieldSchema, CustomPinType, PinType } from "../types"

export const BUILTIN_PIN_TYPES: BuiltinPinType[] = ["one_time", "scheduled", "food_bank", "other"]

export function isCustomPinType(pinType: string): pinType is `custom:${string}` {
  return pinType.startsWith("custom:")
}

export function isBuiltinPinType(pinType: string): pinType is BuiltinPinType {
  return (BUILTIN_PIN_TYPES as string[]).includes(pinType)
}

export function customSlugFromPinType(pinType: string): string | null {
  if (!isCustomPinType(pinType)) return null
  const slug = pinType.slice("custom:".length)
  return slug || null
}

export function findCustomPinType(pinType: string, catalog: CustomPinType[]): CustomPinType | undefined {
  const slug = customSlugFromPinType(pinType)
  if (!slug) return undefined
  return catalog.find((t) => t.slug === slug)
}

export function schemaFields(customType: CustomPinType | undefined): CustomFieldSchema[] {
  return customType?.schema?.fields ?? []
}

export const DEFAULT_CUSTOM_MARKER_COLOR = "#6366f1"

export function customTypeMarkerColor(customType: CustomPinType | undefined): string {
  return customType?.marker_color || DEFAULT_CUSTOM_MARKER_COLOR
}

export function listSelectablePinTypes(
  enabledBuiltins: BuiltinPinType[],
  customTypes: CustomPinType[]
): PinType[] {
  const builtins = BUILTIN_PIN_TYPES.filter((t) => enabledBuiltins.includes(t))
  const customs = customTypes.map((t) => t.pin_type as PinType)
  return [...builtins, ...customs]
}

export function listFilterPinTypes(pins: { pin_type: PinType }[]): PinType[] {
  return [...new Set(pins.map((p) => p.pin_type))]
}
