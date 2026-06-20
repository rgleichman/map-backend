import React, { useCallback, useEffect, useRef, useState } from "react"
import type { MusicScore } from "../../utils/musicScore"
import { emptyScore, parseScore, scoreHasContent, serializeScore } from "../../utils/musicScore"
import { getAudioContext, playPayload } from "../../utils/musicAudio"
import BlobFieldEditor from "../fieldBlob/BlobFieldEditor"
import MusicPlayStopLabel from "./MusicPlayStopLabel"
import MusicSequencer from "./MusicSequencer"
import { BlobFieldType } from "../../utils/blobFieldType"
import { isBlobFieldRef } from "../../utils/blobFieldValue"

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
  const [previewing, setPreviewing] = useState(false)
  const playerRef = useRef<ReturnType<typeof playPayload> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      playerRef.current?.stop()
      playerRef.current = null
    }
  }, [])

  const togglePreview = useCallback(async (score: MusicScore) => {
    if (!scoreHasContent(score)) return
    if (previewing) {
      playerRef.current?.stop()
      playerRef.current = null
      setPreviewing(false)
      return
    }
    const ctx = getAudioContext()
    if (ctx.state === "suspended") await ctx.resume()
    const player = playPayload(ctx, serializeScore(score))
    playerRef.current = player
    setPreviewing(true)
    void player.done.then(() => {
      if (!mountedRef.current) return
      playerRef.current = null
      setPreviewing(false)
    })
  }, [previewing])

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
