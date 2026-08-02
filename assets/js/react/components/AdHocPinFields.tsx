import React, { useId, useMemo } from "react"
import type { AdHocField } from "../types"
import {
  AD_HOC_FIELD_TYPE_OPTIONS,
  adHocFieldSchema,
  createAdHocField,
  removeAdHocField,
  updateAdHocField,
} from "../utils/adHocFields"
import { CustomFieldInput } from "./CustomPinFields"
import Button from "./ui/Button"

type Props = {
  fields: AdHocField[]
  onChange: (fields: AdHocField[]) => void
  csrfToken?: string
  pinId?: number | null
  /** Field ids already stored on the pin; new rows stay draft-only until pin Save. */
  serverFieldIds?: ReadonlySet<string>
}

/** Author-defined extra fields on a single pin (separate from the type schema). */
export default function AdHocPinFields({
  fields,
  onChange,
  csrfToken,
  pinId,
  serverFieldIds,
}: Props) {
  const uid = useId()
  const persistedIds = useMemo(() => serverFieldIds ?? new Set<string>(), [serverFieldIds])

  const addField = () => onChange([...fields, createAdHocField()])

  return (
    <div className="space-y-2" id={`${uid}-ad-hoc-fields`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-base-content">Extra fields</p>
        <Button type="button" variant="ghost" size="sm" onClick={addField}>
          Add field
        </Button>
      </div>
      {fields.length === 0 ? (
        <p className="text-xs text-base-content/60">
          Add fields that only apply to this pin.
        </p>
      ) : null}
      {fields.map((field, index) => {
        const labelId = `${uid}-ad-hoc-${index}-label`
        const typeId = `${uid}-ad-hoc-${index}-type`
        const fieldName = field.label.trim() || `field ${index + 1}`

        return (
          <div
            key={field.id}
            className="space-y-2 rounded-lg border border-base-300 bg-base-200/40 p-3 transition-colors hover:border-base-content/20"
          >
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1">
                <label htmlFor={labelId} className="mb-1 block text-xs font-medium text-base-content/70">
                  Name
                </label>
                <input
                  id={labelId}
                  type="text"
                  className="input input-bordered input-sm w-full"
                  placeholder="Field name…"
                  value={field.label}
                  onChange={(e) => onChange(updateAdHocField(fields, field.id, { label: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor={typeId} className="mb-1 block text-xs font-medium text-base-content/70">
                  Type
                </label>
                <select
                  id={typeId}
                  className="select select-bordered select-sm"
                  value={field.type}
                  onChange={(e) =>
                    onChange(
                      updateAdHocField(fields, field.id, {
                        type: e.target.value as AdHocField["type"],
                        value: undefined,
                      })
                    )
                  }
                >
                  {AD_HOC_FIELD_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove ${fieldName}`}
                onClick={() => onChange(removeAdHocField(fields, field.id))}
              >
                Remove
              </Button>
            </div>
            <CustomFieldInput
              field={adHocFieldSchema(field)}
              value={field.value}
              onValue={(value) => onChange(updateAdHocField(fields, field.id, { value }))}
              csrfToken={csrfToken}
              pinId={pinId}
              serverFieldReady={persistedIds.has(field.id)}
              fieldKey={field.id}
            />
          </div>
        )
      })}
    </div>
  )
}
