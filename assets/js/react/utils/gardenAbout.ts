import type { SubMap } from "../types"

/** Trimmed text, or null when missing/whitespace-only. */
export function presentGardenText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

export function gardenRulesText(subMap: SubMap | null | undefined): string | null {
  return presentGardenText(subMap?.rules)
}

export function gardenDescriptionText(subMap: SubMap | null | undefined): string | null {
  return presentGardenText(subMap?.description)
}

/** True when the About sheet has description and/or rules to show. */
export function hasGardenAboutContent(subMap: SubMap | null | undefined): boolean {
  return gardenDescriptionText(subMap) != null || gardenRulesText(subMap) != null
}

export function hasGardenRules(subMap: SubMap | null | undefined): boolean {
  return gardenRulesText(subMap) != null
}

/** Callout while adding or editing a plant on a garden that has rules. */
export function shouldShowGardenRulesCallout(subMap: SubMap | null | undefined): boolean {
  return hasGardenRules(subMap)
}

export type GardenAboutToolbarEntry = "hidden" | "chip" | "menu"

/** How About is reached from the garden identity chip. */
export function gardenAboutToolbarEntry(
  subMap: SubMap | null | undefined,
  hasMenuItems: boolean,
): GardenAboutToolbarEntry {
  if (!hasGardenAboutContent(subMap)) return "hidden"
  return hasMenuItems ? "menu" : "chip"
}
