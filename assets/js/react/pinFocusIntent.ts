import type { PinFocusIntent } from "./hooks/mapHookTypes"

/** Pure guard for applying a one-shot focus intent (token + load readiness). */
export function shouldApplyFocusIntent(
  intent: PinFocusIntent | null,
  lastAppliedToken: number,
  loading: boolean,
  pinPresent: boolean,
): boolean {
  if (intent == null || loading) return false
  if (lastAppliedToken === intent.token) return false
  return pinPresent
}
