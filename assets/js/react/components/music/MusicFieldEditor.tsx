import React, { useCallback } from "react"
import type { MusicScore } from "../../utils/musicScore"
import { emptyScore, parseScore, scoreHasContent, serializeScore } from "../../utils/musicScore"
import BlobFieldEditor from "../fieldBlob/BlobFieldEditor"
import MusicPlayStopLabel from "./MusicPlayStopLabel"
import MusicSequencer from "./MusicSequencer"
import { BlobFieldType } from "../../utils/blobFieldType"
import { isBlobFieldRef } from "../../utils/blobFieldValue"
import { useMusicPreview } from "../../hooks/useMusicPreview"

export { isBlobFieldRef as isMusicFieldRef }

export type MusicFieldEditorProps = {
  csrfToken?: string
  pinId: number | null
  fieldKey: string
  fieldLabel?: string
  value: unknown
  onValue: (v: unknown) => void
}

export default function MusicFieldEditor({
  csrfToken,
  pinId,
  fieldKey,
  fieldLabel = "Song",
  value,
  onValue,
}: MusicFieldEditorProps) {
  const { playing: previewing, toggle } = useMusicPreview()

  const togglePreview = useCallback(
    async (score: MusicScore) => {
      if (!scoreHasContent(score)) return
      await toggle(() => serializeScore(score))
    },
    [toggle]
  )

  return (
    <BlobFieldEditor<MusicScore>
      blobType={BlobFieldType.Music}
      csrfToken={csrfToken}
      pinId={pinId}
      fieldKey={fieldKey}
      fieldLabel={fieldLabel}
      value={value}
      onValue={onValue}
      empty={emptyScore}
      parse={parseScore}
      serialize={serializeScore}
      hasContent={scoreHasContent}
      editLabel="Edit song"
      deleteLabel="Delete music"
      emptyHint="Open the editor to compose."
      saveEmptyError="Add at least one note before saving."
      renderSummary={(score) => `${score.tempo} BPM · ${score.steps} steps · pattern ready`}
      renderToolbarExtra={({ data, disabled, hasContent }) =>
        hasContent ? (
          <button
            type="button"
            className={`btn btn-xs ${previewing ? "btn-secondary" : "btn-outline"}`}
            onClick={() => void togglePreview(data)}
            disabled={disabled}
          >
            <MusicPlayStopLabel playing={previewing} />
          </button>
        ) : null
      }
      renderEditor={({ data, onChange, disabled }) => (
        <MusicSequencer score={data} onChange={onChange} disabled={disabled} />
      )}
    />
  )
}
