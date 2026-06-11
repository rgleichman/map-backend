import type { SubMap } from "../types"

/** True when the user may opt in/out of world-map visibility on create/edit pin. */
export function canChooseWorldVisibility(subMap: SubMap | null): boolean {
  return (
    subMap?.promote_to_world_default === "ask" &&
    (subMap.can_post === true || subMap.can_moderate === true)
  )
}
