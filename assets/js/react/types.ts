export type PinType = "one_time" | "scheduled" | "food_bank" | "other"

export type PinStatus = "pending" | "approved" | "rejected" | "archived"

export type Pin = {
  id: number
  title: string
  latitude: number
  longitude: number
  pin_type: PinType
  description?: string
  icon_url?: string
  is_owner?: boolean
  status?: PinStatus
  visible_on_world_map?: boolean
  tags: string[]
  start_time?: string // ISO string
  end_time?: string // ISO string
  schedule_rrule?: string // iCal RRULE for recurring schedule
  schedule_timezone?: string // IANA timezone for schedule
}

export type NewPin = {
  title: string
  pin_type: PinType
  description?: string
  latitude: number
  longitude: number
  tags: string[]
  start_time?: string // ISO string
  end_time?: string // ISO string
  schedule_rrule?: string // iCal RRULE for recurring schedule
  schedule_timezone?: string // IANA timezone for schedule
  visible_on_world_map?: boolean
}

export type UpdatePin = {
  title: string
  description?: string
  tags: string[]
  start_time?: string | null // ISO string
  end_time?: string | null // ISO string
  schedule_rrule?: string | null // iCal RRULE for recurring schedule
  schedule_timezone?: string | null // IANA timezone for schedule
  latitude?: number
  longitude?: number
  visible_on_world_map?: boolean
}

export type SubMap = {
  community_url: string
  name: string
  description?: string | null
  rules?: string | null
  contribution_mode: string
  promote_to_world_default: string
  visibility: string
  settings: Record<string, unknown>
  pin_count?: number
  member_count?: number
  pending_count?: number
  can_moderate?: boolean
  can_post?: boolean
  can_edit?: boolean
  membership?: { role: string; status: string } | null
}

export type ReportCategory = "inaccurate" | "abusive_or_hateful" | "spam" | "other"

export type ContentReportPayload = {
  subject_type: "pin"
  subject_id: number
  category: ReportCategory
  details?: string
}
