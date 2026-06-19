import React, { useCallback, useEffect, useRef, useState } from "react"
import type { CustomFieldSchema } from "../types"
import MusicFieldEditor, { isMusicFieldRef } from "./music/MusicFieldEditor"
import MusicPlayStopLabel from "./music/MusicPlayStopLabel"
import { isMusicFieldDraft, musicFieldDraftHasContent } from "../utils/musicFieldValue"
import { getAudioContext, playPayload } from "../utils/musicAudio"
import { fetchMusicPayload } from "../utils/musicPayloadCache"

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
    case "textarea":
      return (
        <textarea
          className="textarea textarea-bordered w-full text-base-content"
          rows={3}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onValue(e.target.value)}
        />
      )
    case "number":
      return (
        <input
          type="number"
          className="input input-bordered w-full"
          value={typeof value === "number" ? value : value === undefined ? "" : String(value)}
          onChange={(e) => onValue(e.target.value === "" ? undefined : Number(e.target.value))}
        />
      )
    case "boolean":
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
    case "select":
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
    case "url":
      return (
        <input
          type="url"
          className="input input-bordered w-full"
          placeholder="https://"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onValue(e.target.value)}
        />
      )
    case "list": {
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
    case "music":
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
    default:
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

export function validateCustomFields(
  fields: CustomFieldSchema[],
  values: Record<string, unknown>
): string | null {
  for (const field of fields) {
    if (!field.required) continue
    const value = values[field.key]
    if (field.type === "music") {
      if (isMusicFieldRef(value) || musicFieldDraftHasContent(value)) continue
    }
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
      return `${field.label} is required`
    }
  }
  return null
}

export function isCustomFieldEmpty(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return true
  if (Array.isArray(value) && value.length === 0) return true
  if (musicFieldDraftHasContent(value)) return false
  if (isMusicFieldDraft(value)) return true
  if (isMusicFieldRef(value)) return false
  if (typeof value === "object" && value != null && "ref" in (value as Record<string, unknown>)) return true
  return false
}

export function formatCustomFieldValue(field: CustomFieldSchema, value: unknown): string {
  if (value === undefined || value === null) return ""
  if (field.type === "boolean") return value === true ? "Yes" : "No"
  if (field.type === "list" && Array.isArray(value)) return value.join(", ")
  if (field.type === "select") {
    const opt = field.options?.find((o) => o.value === value)
    return opt?.label ?? String(value)
  }
  return String(value)
}

type CustomFieldDisplayProps = {
  field: CustomFieldSchema
  value: unknown
  className?: string
}

export function CustomFieldDisplay({ field, value, className }: CustomFieldDisplayProps) {
  if (isCustomFieldEmpty(value)) {
    return <span className={`text-base-content/50 ${className ?? ""}`.trim()}>—</span>
  }

  if (field.type === "music") {
    return <MusicFieldDisplay fieldKey={field.key} value={value} className={className} />
  }

  if (field.type === "url" && typeof value === "string") {
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
  if (field.type === "textarea") {
    return <span className={`whitespace-pre-wrap break-words ${className ?? ""}`.trim()}>{text}</span>
  }

  return <span className={className}>{text}</span>
}

type MusicFieldDisplayProps = {
  fieldKey: string
  value: unknown
  className?: string
  pinId?: number
}

function MusicFieldDisplay({ fieldKey, value, className }: MusicFieldDisplayProps) {
  const pinId = useMusicPinId()
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
      const payload = await fetchMusicPayload(pinId, fieldKey)
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

/**
 * Popup content renders within a maplibre popup; we don't have direct access to the pin id in
 * `CustomFieldDisplay`'s props today. `PopupContent` injects it via a lightweight context.
 */
const MusicPinIdContext = React.createContext<number | null>(null)
export function MusicPinIdProvider({ pinId, children }: { pinId: number; children: React.ReactNode }) {
  return <MusicPinIdContext.Provider value={pinId}>{children}</MusicPinIdContext.Provider>
}
function useMusicPinId(): number | null {
  return React.useContext(MusicPinIdContext)
}
