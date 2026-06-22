import React, { useCallback, useEffect, useRef, useState } from "react"
import * as api from "../../api/client"
import { invalidateBlobPayloadCache } from "../../utils/blobPayloadCache"
import {
  blobFieldDraftPayload,
  isBlobFieldDraft,
  isBlobFieldRef,
} from "../../utils/blobFieldValue"
import type { BlobFieldType } from "../../utils/blobFieldType"
import { useIsDesktop } from "../../hooks/useMediaQuery"
import FieldEditorModal from "./FieldEditorModal"

export type BlobFieldEditorProps<T> = {
  blobType: BlobFieldType
  csrfToken?: string
  pinId: number | null
  fieldKey: string
  fieldLabel?: string
  value: unknown
  onValue: (v: unknown) => void
  empty: () => T
  parse: (payload: string) => T
  serialize: (data: T) => string
  hasContent: (data: T) => boolean
  editLabel: string
  deleteLabel: string
  emptyHint: string
  saveEmptyError: string
  renderSummary?: (data: T) => React.ReactNode
  renderToolbarExtra?: (ctx: {
    data: T
    disabled: boolean
    hasContent: boolean
  }) => React.ReactNode
  renderEditor: (props: {
    data: T
    onChange: (data: T) => void
    disabled: boolean
  }) => React.ReactNode
  modalFillAvailable?: boolean
}

export default function BlobFieldEditor<T>({
  blobType,
  csrfToken,
  pinId,
  fieldKey,
  fieldLabel = "Field",
  value,
  onValue,
  empty,
  parse,
  serialize,
  hasContent,
  editLabel,
  deleteLabel,
  emptyHint,
  saveEmptyError,
  renderSummary,
  renderToolbarExtra,
  renderEditor,
  modalFillAvailable = false,
}: BlobFieldEditorProps<T>) {
  const isDesktop = useIsDesktop()
  const saved = isBlobFieldRef(value)
  const draftStored = isBlobFieldDraft(value)
  const [data, setData] = useState<T>(() => {
    const payload = blobFieldDraftPayload(value)
    return payload ? parse(payload) : empty()
  })
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const autoLoadedRef = useRef(false)
  const canUseApi = pinId != null

  useEffect(() => {
    const payload = blobFieldDraftPayload(value)
    if (payload) {
      setData(parse(payload))
      setDirty(true)
      return
    }
    if (isBlobFieldRef(value)) return
    if (value === undefined) {
      setData(empty())
      setDirty(false)
    }
  }, [value, empty, parse])

  const loadExisting = useCallback(async () => {
    if (!canUseApi) return
    setError(null)
    setLoading(true)
    try {
      const res = await api.getFieldBlob(pinId, blobType, fieldKey)
      const payload = res.data.payload ?? ""
      setData(parse(payload))
      setDirty(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load field.")
    } finally {
      setLoading(false)
    }
  }, [blobType, canUseApi, fieldKey, parse, pinId])

  useEffect(() => {
    if (!canUseApi || !saved || autoLoadedRef.current) return
    autoLoadedRef.current = true
    void loadExisting()
  }, [canUseApi, fieldKey, loadExisting, pinId, saved])

  useEffect(() => {
    autoLoadedRef.current = false
  }, [fieldKey, pinId])

  const persistData = useCallback(
    (next: T, markDirty = true) => {
      setData(next)
      if (markDirty) setDirty(true)
      setError(null)
      if (!canUseApi) {
        onValue({ draft: serialize(next) })
      }
    },
    [canUseApi, onValue, serialize]
  )

  const handleChange = useCallback(
    (next: T) => {
      persistData(next)
    },
    [persistData]
  )

  const save = useCallback(async (): Promise<boolean> => {
    if (!canUseApi) return true
    if (!hasContent(data)) {
      setError(saveEmptyError)
      return false
    }
    if (!dirty && saved) return true
    setError(null)
    setSaving(true)
    try {
      const payload = serialize(data)
      const refValue = await api.upsertFieldBlobAndGetRef(
        csrfToken,
        pinId,
        blobType,
        fieldKey,
        payload
      )
      if (refValue === undefined) {
        setError("Saved, but no reference was returned.")
        return false
      }
      invalidateBlobPayloadCache(pinId, blobType, fieldKey)
      onValue(refValue)
      setDirty(false)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.")
      return false
    } finally {
      setSaving(false)
    }
  }, [
    blobType,
    canUseApi,
    csrfToken,
    data,
    dirty,
    fieldKey,
    hasContent,
    onValue,
    pinId,
    saveEmptyError,
    saved,
    serialize,
  ])

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
      setData(empty())
      setDirty(false)
      setEditorOpen(false)
      return
    }
    setError(null)
    setDeleting(true)
    try {
      await api.deleteFieldBlob(csrfToken, pinId, blobType, fieldKey)
      invalidateBlobPayloadCache(pinId, blobType, fieldKey)
      onValue(undefined)
      setData(empty())
      setDirty(false)
      setEditorOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete.")
    } finally {
      setDeleting(false)
    }
  }, [blobType, canUseApi, csrfToken, empty, fieldKey, onValue, pinId])

  const editorDisabled = loading || saving || deleting
  const contentPresent = hasContent(data)
  const pendingPinDraft = !canUseApi && (draftStored || contentPresent)

  const statusMessage =
    saved && dirty ? (
      <span className="badge badge-warning badge-sm">Unsaved changes</span>
    ) : pendingPinDraft ? (
      <span className="inline-flex items-center gap-1">
        <span className="badge badge-warning badge-sm">Draft</span>
        <span>Saves when you add the pin.</span>
      </span>
    ) : !saved && !contentPresent ? (
      <span className="inline-flex items-center gap-1">
        <span className="badge badge-ghost badge-sm">Empty</span>
        <span>{emptyHint}</span>
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
              {editLabel}
            </button>
            {renderToolbarExtra?.({ data, disabled: editorDisabled, hasContent: contentPresent })}
            <button
              type="button"
              className="btn btn-xs btn-error btn-outline"
              onClick={() => void remove()}
              disabled={deleting || (!canUseApi && !contentPresent && !draftStored)}
            >
              {deleting ? "Deleting…" : deleteLabel}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-base-content/70 py-2 justify-center">
            <span className="loading loading-spinner loading-sm" />
            Loading…
          </div>
        ) : contentPresent && renderSummary ? (
          <p className="text-xs text-base-content/60">{renderSummary(data)}</p>
        ) : null}

        {error ? <div className="text-xs text-error">{error}</div> : null}
      </div>

      <FieldEditorModal
        open={editorOpen}
        fieldLabel={fieldLabel}
        onDone={handleEditorDone}
        disabled={editorDisabled}
        saving={saving}
        error={error}
        isDesktop={isDesktop}
        fillAvailable={modalFillAvailable}
      >
        {renderEditor({ data, onChange: handleChange, disabled: editorDisabled })}
      </FieldEditorModal>
    </>
  )
}
