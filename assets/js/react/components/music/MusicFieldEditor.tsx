import React, { useCallback, useEffect, useRef, useState } from "react"
import * as api from "../../api/client"
import { invalidateMusicPayloadCache } from "../../utils/musicPayloadCache"
import type { MusicScore } from "../../utils/musicScore"
import { emptyScore, parseScore, scoreHasContent, serializeScore } from "../../utils/musicScore"
import MusicSequencer from "./MusicSequencer"

export type MusicFieldEditorProps = {
  csrfToken?: string
  pinId: number | null
  fieldKey: string
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
  value,
  onValue,
}: MusicFieldEditorProps) {
  const saved = isMusicFieldRef(value)
  const [score, setScore] = useState<MusicScore>(() => emptyScore())
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const autoLoadedRef = useRef(false)
  const canUseApi = pinId != null

  const loadExisting = useCallback(async () => {
    if (!canUseApi) {
      setError("Save the pin first, then load music.")
      return
    }
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

  const handleScoreChange = useCallback((next: MusicScore) => {
    setScore(next)
    setDirty(true)
    setError(null)
  }, [])

  const save = useCallback(async () => {
    if (!canUseApi) {
      setError("Save the pin first, then add music.")
      return
    }
    if (!scoreHasContent(score)) {
      setError("Add at least one note before saving.")
      return
    }
    setError(null)
    setSaving(true)
    try {
      const payload = serializeScore(score)
      const refValue = await api.upsertMusicFieldAndGetRef(csrfToken, pinId, fieldKey, payload)
      if (refValue === undefined) {
        setError("Music saved, but no reference was returned.")
      } else {
        invalidateMusicPayloadCache(pinId, fieldKey)
        onValue(refValue)
        setDirty(false)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save music.")
    } finally {
      setSaving(false)
    }
  }, [canUseApi, csrfToken, fieldKey, onValue, pinId, score])

  const remove = useCallback(async () => {
    if (!canUseApi) {
      onValue(undefined)
      setScore(emptyScore())
      setDirty(false)
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete music.")
    } finally {
      setDeleting(false)
    }
  }, [canUseApi, csrfToken, fieldKey, onValue, pinId])

  const editorDisabled = !canUseApi || loading || saving || deleting

  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-base-content/70">
          {saved ? (
            <span className="inline-flex items-center gap-1">
              <span className="badge badge-success badge-sm">Saved</span>
              <span>
                {dirty ? "Unsaved changes." : "Reference stored on pin."}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <span className="badge badge-ghost badge-sm">Not saved</span>
              <span>{canUseApi ? "Compose and save to attach." : "Save the pin first, then add music."}</span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            className="btn btn-xs btn-ghost"
            onClick={() => void loadExisting()}
            disabled={!canUseApi || loading}
          >
            {loading ? "Loading…" : "Reload"}
          </button>
          <button
            type="button"
            className="btn btn-xs btn-primary"
            onClick={() => void save()}
            disabled={!canUseApi || saving || !scoreHasContent(score)}
          >
            {saving ? "Saving…" : saved ? "Update" : "Save"}
          </button>
          <button
            type="button"
            className="btn btn-xs btn-error btn-outline"
            onClick={() => void remove()}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Remove"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-base-content/70 py-6 justify-center">
          <span className="loading loading-spinner loading-sm" />
          Loading score…
        </div>
      ) : (
        <MusicSequencer score={score} onChange={handleScoreChange} disabled={editorDisabled} />
      )}

      {error ? <div className="text-xs text-error">{error}</div> : null}
    </div>
  )
}
