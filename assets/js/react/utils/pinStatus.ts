import type { PinStatus } from "../types"

/** Runtime pin moderation statuses; values match API `pin.status`. */
export const PinStatusValue = {
  Pending: "pending",
  Approved: "approved",
  Rejected: "rejected",
  Archived: "archived",
} as const satisfies Record<string, PinStatus>

export function isPinStatus(value: string): value is PinStatus {
  return (Object.values(PinStatusValue) as string[]).includes(value)
}

/** Whether to show a moderation status badge (hide quiet approved state). */
export function showPinStatusBadge(status: PinStatus): boolean {
  return status !== PinStatusValue.Approved
}

/** Short label for badges and lists. */
export function pinStatusLabel(status: PinStatus): string {
  switch (status) {
    case PinStatusValue.Pending:
      return "Awaiting approval"
    case PinStatusValue.Approved:
      return "Approved"
    case PinStatusValue.Rejected:
      return "Rejected"
    case PinStatusValue.Archived:
      return "Archived"
  }
}

/** daisyUI badge color class for a pin status. */
export function pinStatusBadgeClass(status: PinStatus): string {
  switch (status) {
    case PinStatusValue.Pending:
      return "badge-warning"
    case PinStatusValue.Approved:
      return "badge-success"
    case PinStatusValue.Rejected:
      return "badge-error"
    case PinStatusValue.Archived:
      return "badge-ghost"
  }
}
