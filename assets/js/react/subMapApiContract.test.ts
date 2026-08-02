import { describe, expect, it } from "vitest"
import type { SubMap } from "./types"

/**
 * Representative GET /api/sub_maps/:community_url payload.
 * Keep keys in sync with StorymapWeb.SubMapJSON (lib/storymap_web/controllers/sub_map_json.ex).
 */
const wireSubMap = {
  community_url: "bbq-austin",
  name: "BBQ Austin",
  color: "#6366f1",
  contribution_mode: "open",
  promote_to_world_default: "ask",
  visibility: "public",
  settings: {},
  enabled_pin_type_ids: [1],
  enabled_pin_types: [],
} satisfies SubMap

describe("SubMap API contract", () => {
  it("types match backend wire keys for pin type settings", () => {
    expect(wireSubMap.enabled_pin_type_ids).toEqual([1])
    expect(wireSubMap.color).toBe("#6366f1")
    expect(wireSubMap).not.toHaveProperty("enabled_builtin_pin_types")
    expect(wireSubMap).not.toHaveProperty("enabled_custom_pin_types")
    expect(wireSubMap).not.toHaveProperty("available_custom_pin_types")
  })
})
