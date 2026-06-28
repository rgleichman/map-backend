import type { BlobFieldType } from "./utils/blobFieldType"

export type ContributionMode = "open" | "members_only" | "approval_required"
export type PromoteToWorldDefault = "never" | "ask" | "always"
export type SubMapVisibility = "public" | "unlisted"
export type MembershipRole = "owner" | "moderator" | "member"
export type MembershipStatus = "active" | "pending" | "banned"

export type BuiltinPinType = "one_time" | "scheduled" | "food_bank" | "other"

/** Built-in enum or `custom:<slug>` from the global catalog. */
export type PinType = BuiltinPinType | `custom:${string}`

export type PinStatus = "pending" | "approved" | "rejected" | "archived"

export type CustomFieldPrimitiveType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "url"
  | "list"

export type CustomFieldSchema = {
  key: string
  label: string
  type: CustomFieldPrimitiveType | BlobFieldType
  required?: boolean
  options?: { value: string; label: string }[]
  item_type?: "text"
}

export type CustomPinType = {
  id: number
  slug: string
  label: string
  description?: string | null
  marker_color?: string | null
  icon?: string | null
  schema: { fields: CustomFieldSchema[] }
  pin_type: `custom:${string}`
  enabled: boolean
}

export type PinCommunity = {
  community_url: string
  name: string
}

/** Metadata about a pin reference edge (not the target pin). */
export type PinLink = {
  pin_id: number
  /** Absent or null = explicit picker link; set = parsed from this field. */
  source_field?: string | null
}

export type Pin = {
  id: number
  title: string
  latitude: number
  longitude: number
  pin_type: PinType
  description?: string
  icon_url?: string
  custom_data?: Record<string, unknown>
  is_owner?: boolean
  status: PinStatus
  visible_on_world_map?: boolean
  community?: PinCommunity | null
  tags: string[]
  start_time?: string // ISO string
  end_time?: string // ISO string
  schedule_rrule?: string // iCal RRULE for recurring schedule
  schedule_timezone?: string // IANA timezone for schedule
  linked_pins?: PinLink[]
}

export type PinCommentAuthor = {
  id: number
}

export type PinComment = {
  id: number
  pin_id: number
  parent_id: number | null
  body: string
  deleted: boolean
  author: PinCommentAuthor | null
  is_author: boolean
  inserted_at: string
  updated_at: string
  replies?: PinComment[]
}

export type NewPin = {
  title: string
  pin_type: PinType
  description?: string
  latitude: number
  longitude: number
  tags: string[]
  /** Arbitrary key/value data for custom pin types (`custom:<slug>`). */
  custom_data?: Record<string, unknown>
  /** ISO datetime-local string (no timezone suffix). */
  start_time?: string
  /** ISO datetime-local string (no timezone suffix). */
  end_time?: string
  /** iCal RRULE for recurring schedule. */
  schedule_rrule?: string
  /** IANA timezone for schedule. */
  schedule_timezone?: string
  visible_on_world_map?: boolean
  linked_pin_ids?: number[]
}

export type UpdatePin = {
  title: string
  description?: string
  tags: string[]
  custom_data?: Record<string, unknown>
  start_time?: string | null
  end_time?: string | null
  schedule_rrule?: string | null
  schedule_timezone?: string | null
  latitude?: number
  longitude?: number
  visible_on_world_map?: boolean
  linked_pin_ids?: number[]
}

export type SubMap = {
  community_url: string
  name: string
  description?: string | null
  rules?: string | null
  contribution_mode: ContributionMode
  promote_to_world_default: PromoteToWorldDefault
  visibility: SubMapVisibility
  settings: Record<string, unknown>
  enabled_builtin_pin_types?: BuiltinPinType[]
  enabled_custom_pin_types?: string[]
  available_custom_pin_types?: CustomPinType[]
  pin_count?: number
  member_count?: number
  pending_count?: number
  can_moderate?: boolean
  can_post?: boolean
  can_edit?: boolean
  membership?: { role: MembershipRole; status: MembershipStatus } | null
}

export type ReportCategory = "inaccurate" | "abusive_or_hateful" | "spam" | "other"

export type ContentReportPayload = {
  subject_type: "pin"
  subject_id: number
  category: ReportCategory
  details?: string
}
