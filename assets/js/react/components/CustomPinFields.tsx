import React, { useCallback, useEffect, useRef, useState } from "react"
import type { CustomFieldSchema } from "../types"
import MusicFieldEditor, { isMusicFieldRef } from "./music/MusicFieldEditor"
import MusicPlayStopLabel from "./music/MusicPlayStopLabel"
import DrawingFieldEditor from "./drawing/DrawingFieldEditor"
import { DrawingPreviewFromPayload } from "./drawing/DrawingPreview"
import { isBlobFieldRef } from "../utils/blobFieldValue"
import { getAudioContext, playPayload } from "../utils/musicAudio"
import { fetchBlobPayload } from "../utils/blobPayloadCache"
import { BlobFieldType, isBlobFieldType } from "../utils/blobFieldType"
import { CustomFieldPrimitiveType, isCustomFieldPrimitiveType } from "../utils/customFieldPrimitiveType"
import {
  formatCustomFieldValue,
  isCustomFieldEmpty,
} from "../utils/customFieldValue"

type Props = {
  fields: CustomFieldSchema[]
  values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void
  csrfToken?: string
  pinId?: number | null
}

export default function CustomPinFields({ fields, values, onChange, csrfToken, pinId }: Props) {
  const setField = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value })
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-base-content mb-1">
            {field.label}
            {field.required ? <span className="text-error"> *</span> : null}
          </label>
          {renderField(field, values[field.key], (v) => setField(field.key, v), {
            csrfToken,
            pinId,
            fieldKey: field.key,
          })}
        </div>
      ))}
    </div>
  )
}

function renderField(
  field: CustomFieldSchema,
  value: unknown,
  onValue: (v: unknown) => void,
  ctx: { csrfToken?: string; pinId?: number | null; fieldKey: string }
) {
  switch (field.type) {
    case CustomFieldPrimitiveType.Textarea:
      return (
        <textarea
          className="textarea textarea-bordered w-full text-base-content"
          rows={3}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onValue(e.target.value)}
        />
      )
    case CustomFieldPrimitiveType.Number:
      return (
        <input
          type="number"
          className="input input-bordered w-full"
          value={typeof value === "number" ? value : value === undefined ? "" : String(value)}
          onChange={(e) => onValue(e.target.value === "" ? undefined : Number(e.target.value))}
        />
      )
    case CustomFieldPrimitiveType.Boolean:
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={value === true}
            onChange={(e) => onValue(e.target.checked)}
          />
          <span className="text-sm text-base-content/80">Yes</span>
        </label>
      )
    case CustomFieldPrimitiveType.Select:
      return (
        <select
          className="select select-bordered w-full"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onValue(e.target.value)}
        >
          <option value="">Select…</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )
    case CustomFieldPrimitiveType.Url:
      return (
        <input
          type="url"
          className="input input-bordered w-full"
          placeholder="https://"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onValue(e.target.value)}
        />
      )
    case CustomFieldPrimitiveType.List: {
      const items = Array.isArray(value) ? value.map(String) : [""]
      return (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                className="input input-bordered flex-1"
                value={item}
                onChange={(e) => {
                  const next = [...items]
                  next[idx] = e.target.value
                  onValue(next.filter((s) => s.trim() !== ""))
                }}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onValue(items.filter((_, i) => i !== idx))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onValue([...items, ""])}
          >
            Add item
          </button>
        </div>
      )
    }
    case BlobFieldType.Music:
      return (
        <MusicFieldEditor
          csrfToken={ctx.csrfToken}
          pinId={ctx.pinId ?? null}
          fieldKey={ctx.fieldKey}
          fieldLabel={field.label}
          value={value}
          onValue={onValue}
        />
      )
    case BlobFieldType.Drawing:
      return (
        <DrawingFieldEditor
          csrfToken={ctx.csrfToken}
          pinId={ctx.pinId ?? null}
          fieldKey={ctx.fieldKey}
          fieldLabel={field.label}
          value={value}
          onValue={onValue}
        />
      )
    case CustomFieldPrimitiveType.Text:
      return (
        <input
          type="text"
          className="input input-bordered w-full"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onValue(e.target.value)}
        />
      )
    default:
      if (!isCustomFieldPrimitiveType(field.type) && !isBlobFieldType(field.type)) {
        return null
      }
      return (
        <input
          type="text"
          className="input input-bordered w-full"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onValue(e.target.value)}
        />
      )
  }
}


type CustomFieldDisplayProps = {
  field: CustomFieldSchema
  value: unknown
  className?: string
}

export function CustomFieldDisplay({ field, value, className }: CustomFieldDisplayProps) {
  if (isCustomFieldEmpty(value, field)) {
    return <span className={`text-base-content/50 ${className ?? ""}`.trim()}>—</span>
  }

  if (field.type === BlobFieldType.Music) {
    return <MusicFieldDisplay fieldKey={field.key} value={value} className={className} />
  }

  if (field.type === BlobFieldType.Drawing) {
    return <DrawingFieldDisplay fieldKey={field.key} value={value} className={className} />
  }

  if (field.type === CustomFieldPrimitiveType.Url && typeof value === "string") {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className={`link link-primary break-all ${className ?? ""}`.trim()}
      >
        {value}
      </a>
    )
  }

  const text = formatCustomFieldValue(field, value)
  if (field.type === CustomFieldPrimitiveType.Textarea) {
    return <span className={`whitespace-pre-wrap break-words ${className ?? ""}`.trim()}>{text}</span>
  }

  return <span className={className}>{text}</span>
}

type BlobFieldDisplayProps = {
  fieldKey: string
  value: unknown
  className?: string
}

function MusicFieldDisplay({ fieldKey, value, className }: BlobFieldDisplayProps) {
  const pinId = usePinId()
  const refOk = isMusicFieldRef(value)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
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

  const toggle = useCallback(async () => {
    if (!pinId || !refOk) return
    if (playing) {
      playerRef.current?.stop()
      playerRef.current = null
      setPlaying(false)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const ctx = getAudioContext()
      if (ctx.state === "suspended") {
        await ctx.resume()
      }
      const payload = await fetchBlobPayload(pinId, BlobFieldType.Music, fieldKey)
      const player = playPayload(ctx, payload)
      playerRef.current = player
      setPlaying(true)
      void player.done.then(() => {
        if (!mountedRef.current) return
        playerRef.current = null
        setPlaying(false)
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to play.")
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [fieldKey, pinId, playing, refOk])

  if (!pinId) return <span className={className}>Music</span>
  if (!refOk) return <span className={className}>Music</span>

  return (
    <div className={`inline-flex flex-wrap items-center gap-2 ${className ?? ""}`.trim()}>
      <button
        type="button"
        className={`btn btn-xs ${playing ? "btn-secondary" : "btn-primary"}`}
        onClick={() => void toggle()}
        disabled={loading}
      >
        {loading ? "Loading…" : <MusicPlayStopLabel playing={playing} />}
      </button>
      {error ? <span className="text-xs text-error">{error}</span> : null}
    </div>
  )
}

function DrawingFieldDisplay({ fieldKey, value, className }: BlobFieldDisplayProps) {
  const pinId = usePinId()
  const refOk = isBlobFieldRef(value)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<string | null>(null)

  useEffect(() => {
    if (!pinId || !refOk) {
      setPayload(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    void fetchBlobPayload(pinId, BlobFieldType.Drawing, fieldKey)
      .then((p) => {
        if (!cancelled) setPayload(p)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load drawing.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fieldKey, pinId, refOk])

  if (!pinId || !refOk) return <span className={className}>Drawing</span>
  if (loading) return <span className={`text-xs text-base-content/60 ${className ?? ""}`.trim()}>Loading…</span>
  if (error) return <span className={`text-xs text-error ${className ?? ""}`.trim()}>{error}</span>
  if (!payload) return <span className={className}>Drawing</span>

  return (
    <div className={className}>
      <DrawingPreviewFromPayload payload={payload} />
    </div>
  )
}

const PinIdContext = React.createContext<number | null>(null)

export function PinIdProvider({ pinId, children }: { pinId: number; children: React.ReactNode }) {
  return <PinIdContext.Provider value={pinId}>{children}</PinIdContext.Provider>
}

function usePinId(): number | null {
  return React.useContext(PinIdContext)
}
