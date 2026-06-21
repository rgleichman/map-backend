import type { ReportCategory as ReportCategoryName } from "../types"

export const ReportCategory = {
  Inaccurate: "inaccurate",
  AbusiveOrHateful: "abusive_or_hateful",
  Spam: "spam",
  Other: "other",
} as const satisfies Record<string, ReportCategoryName>

export const REPORT_CATEGORIES: ReportCategoryName[] = Object.values(ReportCategory)
