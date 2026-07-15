import type { Pin } from "../types"
import type { PlaceSuggestion } from "./placeSearch"

export type MapSearchOption =
  | { kind: "pin"; pin: Pin }
  | { kind: "place"; place: PlaceSuggestion }

/** Flatten pin then place suggestions into one keyboard-navigable list. */
export function buildMapSearchOptions(
  pins: Pin[],
  places: PlaceSuggestion[],
): MapSearchOption[] {
  return [
    ...pins.map((pin) => ({ kind: "pin" as const, pin })),
    ...places.map((place) => ({ kind: "place" as const, place })),
  ]
}
