import React from "react"
import type { CustomFieldSchema } from "../types"

type Props = {
  fields: CustomFieldSchema[]
  values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void
}

export default function CustomPinFields({ fields, values, onChange }: Props) {
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
          {renderField(field, values[field.key], (v) => setField(field.key, v))}
        </div>
      ))}
    </div>
  )
}

function renderField(
  field: CustomFieldSchema,
  value: unknown,
  onValue: (v: unknown) => void
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
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
      return `${field.label} is required`
    }
  }
  return null
}

export function isCustomFieldEmpty(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return true
  if (Array.isArray(value) && value.length === 0) return true
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
