import type { BlobFieldType } from "./utils/blobFieldType"

export type ContributionMode = "open" | "members_only" | "approval_required"
export type PromoteToWorldDefault = "never" | "ask" | "always"
export type SubMapVisibility = "public" | "unlisted"
export type MembershipRole = "owner" | "moderator" | "member"
export type MembershipStatus = "active" | "pending" | "banned"

/** Pin type slug from the catalog (no prefixes; every pin type is a catalog row). */
export type PinType = string

/** Pin type schedule capability (wire values match backend Ecto.Enum). */
export type PinTimeMode = "none" | "one_time" | "hours"

/** Marker glyphs available to catalog rows via `icon`. */
export type PinIconName = "carrot" | "calendar" | "building" | "star"

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

/** A pin type row from the catalog (system or user-created). */
export type CatalogPinType = {
  id: number
  slug: string
  label: string
  description?: string | null
  marker_color?: string | null
  icon?: string | null
  schema: { fields: CustomFieldSchema[] }
  time_mode?: PinTimeMode
  allow_open_24_7?: boolean
  is_system?: boolean
  /** Same value as `slug`; present for wire compatibility. */
  pin_type?: string
  enabled: boolean
}

/**
 * Per-pin extra field, defined by the pin author rather than the type schema.
 * Ordered array; blob fields store `{ ref }` in `value` once uploaded.
 */
export type AdHocField = {
  id: string
  label: string
  type: CustomFieldPrimitiveType | BlobFieldType
  options?: { value: string; label: string }[]
  value?: unknown
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
  /** Catalog slug. */
  pin_type: PinType
  pin_type_id: number
  description?: string
  icon_url?: string
  custom_data?: Record<string, unknown>
  ad_hoc_fields?: AdHocField[]
  is_owner?: boolean
  /** True when the authenticated viewer created this pin (not merely can edit). */
  created_by_me?: boolean
  status: PinStatus
  visible_on_world_map?: boolean
  community?: PinCommunity | null
  tags: string[]
  start_time?: string // ISO string
  end_time?: string // ISO string
  schedule_rrule?: string // iCal RRULE for recurring schedule
  schedule_timezone?: string // IANA timezone for schedule
  linked_pins?: PinLink[]
  /** ISO datetime from API (optional on partial channel upserts). */
  inserted_at?: string
  /** ISO datetime from API; used for “new since last visit” highlights. */
  updated_at?: string
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
  /** Catalog slug. */
  pin_type: PinType
  pin_type_id?: number
  description?: string
  latitude: number
  longitude: number
  tags: string[]
  /** Values for the pin type's schema fields, keyed by field key. */
  custom_data?: Record<string, unknown>
  /** Author-defined extra fields, in display order. */
  ad_hoc_fields?: AdHocField[]
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
  pin_type_id?: number
  description?: string
  tags: string[]
  custom_data?: Record<string, unknown>
  ad_hoc_fields?: AdHocField[]
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
  /** Community brand color (#RRGGBB) for space behind the globe and the community bar. */
  color: string
  contribution_mode: ContributionMode
  promote_to_world_default: PromoteToWorldDefault
  visibility: SubMapVisibility
  settings: Record<string, unknown>
  /** Full catalog rows enabled on this map. */
  enabled_pin_types?: CatalogPinType[]
  enabled_pin_type_ids?: number[]
  pin_count?: number
  member_count?: number
  pending_count?: number
  can_moderate?: boolean
  can_post?: boolean
  can_edit?: boolean
  membership?: { role: MembershipRole; status: MembershipStatus } | null
}

export type ReportSubjectType = "pin" | "pin_comment"

export type ReportCategory = "inaccurate" | "abusive_or_hateful" | "spam" | "other"

export type ContentReportPayload = {
  subject_type: ReportSubjectType
  subject_id: number
  category: ReportCategory
  details?: string
}

export type ToggleHeartResult = { needsLogin: true } | { needsLogin: false }
