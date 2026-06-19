import React, { useCallback, useEffect, useRef, useState } from "react"
import * as api from "../../api/client"
import { invalidateMusicPayloadCache } from "../../utils/musicPayloadCache"
import {
  isMusicFieldDraft,
  musicFieldDraftPayload,
} from "../../utils/musicFieldValue"
import type { MusicScore } from "../../utils/musicScore"
import { emptyScore, parseScore, scoreHasContent, serializeScore } from "../../utils/musicScore"
import { getAudioContext, playPayload } from "../../utils/musicAudio"
import { useIsDesktop } from "../../utils/useMediaQuery"
import MusicEditorModal from "./MusicEditorModal"
import MusicPlayStopLabel from "./MusicPlayStopLabel"

export type MusicFieldEditorProps = {
  csrfToken?: string
  pinId: number | null
  fieldKey: string
  fieldLabel?: string
  value: unknown
  onValue: (v: unknown) => void
}

export function isMusicFieldRef(value: unknown): value is api.MusicFieldRef {
  return (
    value != null &&
    typeof value === "object" &&
    "ref" in (value as Record<string, unknown>) &&
    (typeof (value as api.MusicFieldRef).ref === "string" ||
      typeof (value as api.MusicFieldRef).ref === "number")
  )
}

export default function MusicFieldEditor({
  csrfToken,
  pinId,
  fieldKey,
  fieldLabel = "Song",
  value,
  onValue,
}: MusicFieldEditorProps) {
  const isDesktop = useIsDesktop()
  const saved = isMusicFieldRef(value)
  const draftStored = isMusicFieldDraft(value)
  const [score, setScore] = useState<MusicScore>(() => {
    const payload = musicFieldDraftPayload(value)
    return payload ? parseScore(payload) : emptyScore()
  })
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const autoLoadedRef = useRef(false)
  const playerRef = useRef<ReturnType<typeof playPayload> | null>(null)
  const mountedRef = useRef(true)
  const canUseApi = pinId != null

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      playerRef.current?.stop()
      playerRef.current = null
    }
  }, [])

  useEffect(() => {
    const payload = musicFieldDraftPayload(value)
    if (payload) {
      setScore(parseScore(payload))
      setDirty(true)
      return
    }
    if (isMusicFieldRef(value)) return
    if (value === undefined) {
      setScore(emptyScore())
      setDirty(false)
    }
  }, [value])

  const loadExisting = useCallback(async () => {
    if (!canUseApi) return
    setError(null)
    setLoading(true)
    try {
      const res = await api.getMusicField(pinId, fieldKey)
      const payload = res.data.payload ?? ""
      setScore(parseScore(payload))
      setDirty(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load music.")
    } finally {
      setLoading(false)
    }
  }, [canUseApi, fieldKey, pinId])

  useEffect(() => {
    if (!canUseApi || !saved || autoLoadedRef.current) return
    autoLoadedRef.current = true
    void loadExisting()
  }, [canUseApi, fieldKey, loadExisting, pinId, saved])

  useEffect(() => {
    autoLoadedRef.current = false
  }, [fieldKey, pinId])

  const persistScore = useCallback(
    (next: MusicScore, markDirty = true) => {
      setScore(next)
      if (markDirty) setDirty(true)
      setError(null)
      if (!canUseApi) {
        onValue({ draft: serializeScore(next) })
      }
    },
    [canUseApi, onValue]
  )

  const handleScoreChange = useCallback(
    (next: MusicScore) => {
      persistScore(next)
    },
    [persistScore]
  )

  const save = useCallback(async (): Promise<boolean> => {
    if (!canUseApi) return true
    if (!scoreHasContent(score)) {
      setError("Add at least one note before saving.")
      return false
    }
    if (!dirty && saved) return true
    setError(null)
    setSaving(true)
    try {
      const payload = serializeScore(score)
      const refValue = await api.upsertMusicFieldAndGetRef(csrfToken, pinId, fieldKey, payload)
      if (refValue === undefined) {
        setError("Music saved, but no reference was returned.")
        return false
      }
      invalidateMusicPayloadCache(pinId, fieldKey)
      onValue(refValue)
      setDirty(false)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save music.")
      return false
    } finally {
      setSaving(false)
    }
  }, [canUseApi, csrfToken, dirty, fieldKey, onValue, pinId, saved, score])

  const handleEditorDone = useCallback(async () => {
    if (canUseApi) {
      const ok = await save()
      if (!ok) return
    }
    setEditorOpen(false)
  }, [canUseApi, save])

  const remove = useCallback(async () => {
    if (!canUseApi) {
      onValue(undefined)
      setScore(emptyScore())
      setDirty(false)
      setEditorOpen(false)
      return
    }
    setError(null)
    setDeleting(true)
    try {
      await api.deleteMusicField(csrfToken, pinId, fieldKey)
      invalidateMusicPayloadCache(pinId, fieldKey)
      onValue(undefined)
      setScore(emptyScore())
      setDirty(false)
      setEditorOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete music.")
    } finally {
      setDeleting(false)
    }
  }, [canUseApi, csrfToken, fieldKey, onValue, pinId])

  const togglePreview = useCallback(async () => {
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
  }, [previewing, score])

  const editorDisabled = loading || saving || deleting
  const hasContent = scoreHasContent(score)
  const pendingPinDraft = !canUseApi && (draftStored || hasContent)

  const statusMessage =
    saved && dirty ? (
      <span className="badge badge-warning badge-sm">Unsaved changes</span>
    ) : pendingPinDraft ? (
      <span className="inline-flex items-center gap-1">
        <span className="badge badge-warning badge-sm">Draft</span>
        <span>Saves when you add the pin.</span>
      </span>
    ) : !saved && !hasContent ? (
      <span className="inline-flex items-center gap-1">
        <span className="badge badge-ghost badge-sm">Empty</span>
        <span>Open the editor to compose.</span>
      </span>
    ) : null

  return (
    <>
      <div className="rounded-box border border-base-300 bg-base-100 p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {statusMessage ? (
            <div className="text-xs text-base-content/70 w-full">{statusMessage}</div>
          ) : null}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              className="btn btn-xs btn-primary"
              onClick={() => setEditorOpen(true)}
              disabled={editorDisabled}
            >
              Edit song
            </button>
            {hasContent ? (
              <button
                type="button"
                className={`btn btn-xs ${previewing ? "btn-secondary" : "btn-outline"}`}
                onClick={() => void togglePreview()}
                disabled={editorDisabled}
              >
                <MusicPlayStopLabel playing={previewing} />
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-xs btn-error btn-outline"
              onClick={() => void remove()}
              disabled={deleting || (!canUseApi && !hasContent && !draftStored)}
            >
              {deleting ? "Deleting…" : "Delete music"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-base-content/70 py-2 justify-center">
            <span className="loading loading-spinner loading-sm" />
            Loading score…
          </div>
        ) : hasContent ? (
          <p className="text-xs text-base-content/60">
            {score.tempo} BPM · {score.steps} steps · pattern ready
          </p>
        ) : null}

        {error ? <div className="text-xs text-error">{error}</div> : null}
      </div>

      <MusicEditorModal
        open={editorOpen}
        fieldLabel={fieldLabel}
        score={score}
        onChange={handleScoreChange}
        onDone={handleEditorDone}
        disabled={editorDisabled}
        saving={saving}
        error={error}
        isDesktop={isDesktop}
      />
    </>
  )
}
