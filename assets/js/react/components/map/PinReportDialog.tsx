import React from "react"
import ContentReportDialog from "./ContentReportDialog"
import { ReportSubjectType } from "../../utils/reportSubjectType"
import { GardenCopy } from "../../utils/gardenCopy"

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
      title={GardenCopy.reportThisPlant}
      detailsPlaceholder={GardenCopy.reportPlantPlaceholder}
      csrfToken={csrfToken}
      open={open}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  )
}
