import React, { useState } from "react"
import { useIsDesktop } from "../utils/useMediaQuery"
import ScheduleRruleBuilder from "./ScheduleRruleBuilder"
import type { PinType } from "../types"

type Props = {
  layout?: "modal" | "panel"
  /** When true (mobile add from placement), location was just set; can hide or reword "Set location on map". */
  locationAlreadySetFromPlacement?: boolean
  pinType: PinType
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
}

export default function PinModal({
  layout = "modal",
  locationAlreadySetFromPlacement = false,
  pinType,
  title, setTitle,
  description, setDescription,
  tags, setTags,
  startTime, setStartTime,
  endTime, setEndTime,
  scheduleRrule, setScheduleRrule,
  scheduleTimezone, setScheduleTimezone,
  latitude, longitude,
  onStartPickOnMap,
  mode, onCancel, onSave, onDelete, canDelete, saving = false
}: Props) {
  const isDesktop = useIsDesktop()
  const [tagInput, setTagInput] = useState("")
  const isTimeOnly = pinType === "scheduled" || pinType === "food_bank"

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

  const formContent = (
    <div className="pin-modal-content rounded-lg min-w-[300px] max-h-[100vh] overflow-y-auto overscroll-contain shadow-xl p-6">
      <h2 className="text-lg font-semibold mb-4">{mode === "edit" ? "Edit Pin" : "Add Pin"}</h2>
      <label htmlFor="pin-title" className="block font-medium mb-1">Title</label>
      <input
        id="pin-title"
        name="title"
        type="text"
        placeholder="Title…"
        autoComplete="off"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus={mode === "add" && isDesktop}
        className="w-full mb-4 px-3 py-2 rounded border"
      />
      <label htmlFor="pin-description" className="block font-medium mb-1">Description</label>
      <textarea
        id="pin-description"
        name="description"
        placeholder="Description…"
        autoComplete="off"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full mb-4 px-3 py-2 rounded border"
      />

      <div className="mb-4">
        <label className="block font-medium mb-1">Location</label>
        <p className="text-sm text-base-content/80 mb-2">
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
            onTimezoneChange={setScheduleTimezone}
            timeOfDay={startTime}
          />
        )}
      </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      {formContent}
    </div>
  )
}
