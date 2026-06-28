import type { ReportSubjectType as ReportSubjectTypeName } from "../types"

export const ReportSubjectType = {
  Pin: "pin",
  PinComment: "pin_comment",
} as const satisfies Record<string, ReportSubjectTypeName>

export function isReportSubjectType(value: string): value is ReportSubjectTypeName {
  return value === ReportSubjectType.Pin || value === ReportSubjectType.PinComment
}
