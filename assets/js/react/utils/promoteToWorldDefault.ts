import type { PromoteToWorldDefault as PromoteToWorldDefaultName } from "../types"

export const PromoteToWorldDefault = {
  Never: "never",
  Ask: "ask",
  Always: "always",
} as const satisfies Record<string, PromoteToWorldDefaultName>
