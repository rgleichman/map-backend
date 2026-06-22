import React, { useEffect, useId, useState } from "react"
import ScheduleRruleBuilder from "./ScheduleRruleBuilder"
import CustomPinFields from "./CustomPinFields"
import type { PinType } from "../types"
import { usePinTypes } from "../context/PinTypesContext"
import { BuiltinPinType, isTimeOnlyBuiltinPinType } from "../utils/builtinPinType"
import { findCustomPinType, isCustomPinType, schemaFields } from "../utils/customPinTypes"

type Props = {
  layout?: "modal" | "panel"
  /** When true (mobile add from placement), location was just set; can hide or reword "Set location on map". */
  locationAlreadySetFromPlacement?: boolean
  pinType: PinType
  csrfToken?: string
  pinId?: number | null
  title: string
  setTitle: (t: string) => void
  description: string
  setDescription: (d: string) => void
  tags: string[]
  setTags: (tags: string[]) => void
  startTime: string
  setStartTime: (t: string) => void
  endTime: string
  setEndTime: (t: string) => void
  scheduleRrule: string
  setScheduleRrule: (s: string) => void
  scheduleTimezone: string
  setScheduleTimezone: (s: string) => void
  /** Only for food_bank: when true, open 24/7 (time/schedule fields hidden). */
  open24_7?: boolean
  setOpen24_7?: (v: boolean) => void
  /** Community maps with promote_to_world_default "ask": optional world-map visibility. */
  showPromoteToWorld?: boolean
  promoteToWorld?: boolean
  setPromoteToWorld?: (v: boolean) => void
  latitude: number
  longitude: number
  onStartPickOnMap: () => void
  mode: "add" | "edit"
  onCancel: () => void
  onSave: () => void
  onDelete?: () => void
  canDelete?: boolean
  /** When true, Save/Add is disabled and shows loading state. */
  saving?: boolean
  customData?: Record<string, unknown>
  setCustomData?: (data: Record<string, unknown>) => void
}

export default function PinModal({
  layout = "modal",
  locationAlreadySetFromPlacement = false,
  pinType,
  csrfToken,
  pinId = null,
  title, setTitle,
  description, setDescription,
  tags, setTags,
  startTime, setStartTime,
  endTime, setEndTime,
  scheduleRrule, setScheduleRrule,
  scheduleTimezone, setScheduleTimezone,
  open24_7 = true,
  setOpen24_7,
  showPromoteToWorld = false,
  promoteToWorld = false,
  setPromoteToWorld,
  latitude, longitude,
  onStartPickOnMap,
  mode, onCancel, onSave, onDelete, canDelete, saving = false,
  customData = {},
  setCustomData,
}: Props) {
  const { catalog } = usePinTypes()
  const uid = useId()
  const headingId = `${uid}-pin-modal-title`
  const locationLabelId = `${uid}-pin-location-label`
  const open247Id = `${uid}-pin-open-24-7`
  const promoteWorldId = `${uid}-pin-promote-world`
  const [tagInput, setTagInput] = useState("")
  const isTimeOnly = isTimeOnlyBuiltinPinType(pinType)
  const isFoodBank = pinType === BuiltinPinType.FoodBank
  const isOther = pinType === BuiltinPinType.Other
  const isCustom = isCustomPinType(pinType)
  const customType = isCustom ? findCustomPinType(pinType, catalog) : undefined
  const showTimeFields = !isOther && !isCustom && !(isFoodBank && open24_7)

  const handleAddTag = () => {
    const newTag = tagInput.trim()
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag])
    }
    setTagInput("")
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const formatCoord = (n: number) => n.toFixed(5)

  useEffect(() => {
    if (layout !== "modal") return
    const id = window.requestAnimationFrame(() => {
      document.getElementById("pin-title")?.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [layout])

  const contentClassName =
    layout === "panel"
      ? "pin-modal-content w-full"
      : "pin-modal-content max-h-modal-mobile-90 w-full max-w-lg min-w-[300px] rounded-lg overflow-y-auto overscroll-contain shadow-xl p-6 bg-base-100 border border-base-300"

  const formContent = (
    <div className={contentClassName}>
      <h2 id={headingId} className="text-lg font-semibold mb-4">{mode === "edit" ? "Edit Pin" : "Add Pin"}</h2>
      <label htmlFor="pin-title" className="block font-medium mb-1">Title</label>
      <input
        id="pin-title"
        name="title"
        type="text"
        placeholder="Title…"
        autoComplete="off"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full mb-4 px-3 py-2 rounded border"
      />
      <label htmlFor="pin-description" className="block font-medium mb-1">Description</label>
      <textarea
        id="pin-description"
        name="description"
        placeholder="Description… (example.com or [label](url))"
        autoComplete="off"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full mb-4 px-3 py-2 rounded border"
      />

      {isCustom && customType && setCustomData ? (
        <div className="mb-4">
          <CustomPinFields
            fields={schemaFields(customType)}
            values={customData}
            onChange={setCustomData}
            csrfToken={csrfToken}
            pinId={pinId}
          />
        </div>
      ) : null}

      <div className="mb-4">
        <p id={locationLabelId} className="block font-medium mb-1">
          Location
        </p>
        <p className="text-sm text-base-content/80 mb-2" aria-labelledby={locationLabelId}>
          {formatCoord(latitude)}, {formatCoord(longitude)}
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          <button
            type="button"
            onClick={onStartPickOnMap}
            className="btn btn-sm btn-outline"
          >
            {(locationAlreadySetFromPlacement || mode === "edit") ? "Change location on map" : "Set location on map"}
          </button>
        </div>
      </div>

      {(isFoodBank && setOpen24_7) && (
        <div className="mb-4">
          <label htmlFor={open247Id} className="flex items-center gap-2 cursor-pointer">
            <input
              id={open247Id}
              type="checkbox"
              checked={open24_7}
              onChange={e => setOpen24_7(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="font-medium">Open 24/7</span>
          </label>
        </div>
      )}
      {showTimeFields && (
        <div className="mb-4">
          <label htmlFor="pin-start-time" className="block font-medium mb-1">Start Time</label>
          <input
            id="pin-start-time"
            name="start_time"
            type={isTimeOnly ? "time" : "datetime-local"}
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            className="w-full mb-2 px-3 py-2 rounded border"
          />
          <label htmlFor="pin-end-time" className="block font-medium mb-1">End Time</label>
          <input
            id="pin-end-time"
            name="end_time"
            type={isTimeOnly ? "time" : "datetime-local"}
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            className="w-full mb-2 px-3 py-2 rounded border"
          />
          {isTimeOnly && (
            <ScheduleRruleBuilder
              value={scheduleRrule}
              onChange={setScheduleRrule}
              timezone={scheduleTimezone}
            />
          )}
        </div>
      )}
      <div className="mb-4">
        <label htmlFor="pin-tag-input" className="block font-medium mb-1">Tags</label>
        <div className="flex gap-2 mb-2">
          <input
            id="pin-tag-input"
            name="tag"
            type="text"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
            autoComplete="off"
            className="px-2 py-1 rounded border flex-1"
            placeholder="Add tag…"
          />
          <button type="button" onClick={handleAddTag} className="btn btn-sm btn-primary">Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <span key={tag} className="inline-flex items-center bg-base-200 text-base-content rounded px-2 py-1 text-sm">
              {tag}
              <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-2 text-red-500 hover:text-red-700" aria-label="Remove tag">×</button>
            </span>
          ))}
        </div>
      </div>
      {showPromoteToWorld && setPromoteToWorld && (
        <div className="mb-4">
          <label htmlFor={promoteWorldId} className="flex cursor-pointer items-start gap-2">
            <input
              id={promoteWorldId}
              type="checkbox"
              checked={promoteToWorld}
              onChange={(e) => setPromoteToWorld(e.target.checked)}
              className="checkbox checkbox-sm mt-0.5"
            />
            <span>
              <span className="font-medium">Also show on world map</span>
              <span className="mt-0.5 block text-sm text-base-content/70">
                Visible on the main world map as well as this community.
              </span>
            </span>
          </label>
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn" disabled={saving}>Cancel</button>
        {mode === "edit" && canDelete && (
          <button type="button" onClick={onDelete} className="btn btn-error" disabled={saving}>Delete</button>
        )}
        <button type="button" onClick={onSave} className="btn btn-success" disabled={saving}>
          {saving ? (mode === "edit" ? "Saving…" : "Adding…") : (mode === "edit" ? "Save" : "Add")}
        </button>
      </div>
    </div>
  )

  if (layout === "panel") return formContent
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel()
      }}
    >
      {formContent}
    </div>
  )
}
