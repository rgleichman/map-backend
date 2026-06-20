import React from "react"
import MusicSequencer from "./MusicSequencer"
import type { MusicScore } from "../../utils/musicScore"
import FieldEditorModal from "../fieldBlob/FieldEditorModal"

type Props = {
  open: boolean
  fieldLabel: string
  score: MusicScore
  onChange: (score: MusicScore) => void
  onDone: () => void | Promise<void>
  disabled?: boolean
  saving?: boolean
  error?: string | null
  isDesktop: boolean
}

export default function MusicEditorModal({
  open,
  fieldLabel,
  score,
  onChange,
  onDone,
  disabled = false,
  saving = false,
  error = null,
  isDesktop,
}: Props) {
  return (
    <FieldEditorModal
      open={open}
      fieldLabel={fieldLabel}
      onDone={onDone}
      disabled={disabled}
      saving={saving}
      error={error}
      isDesktop={isDesktop}
    >
      <MusicSequencer score={score} onChange={onChange} disabled={disabled} />
    </FieldEditorModal>
  )
}
