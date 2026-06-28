import React from "react"
import ContentReportDialog from "./ContentReportDialog"
import { ReportSubjectType } from "../../utils/reportSubjectType"

type Props = {
  pinId: number
  csrfToken?: string
  open: boolean
  onClose: () => void
  onSuccess: (message: string) => void
}

export default function PinReportDialog({ pinId, csrfToken, open, onClose, onSuccess }: Props) {
  return (
    <ContentReportDialog
      subjectType={ReportSubjectType.Pin}
      subjectId={pinId}
      title="Report this pin"
      detailsPlaceholder="What is wrong with this pin?"
      csrfToken={csrfToken}
      open={open}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  )
}
