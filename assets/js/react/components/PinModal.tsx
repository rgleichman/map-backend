import React, { useEffect, useId, useMemo } from "react"
import ScheduleRruleBuilder from "./ScheduleRruleBuilder"
import CustomPinFields from "./CustomPinFields"
import RelatedPinsEditor from "./RelatedPinsEditor"
import TagCombobox from "./TagCombobox"
import type { Pin, PinType } from "../types"
import { usePinTypes } from "../context/PinTypesContext"
import { BuiltinPinType, isTimeOnlyBuiltinPinType } from "../utils/builtinPinType"
import { findCustomPinType, isCustomPinType, schemaFields } from "../utils/customPinTypes"
import { deriveMapTags } from "../utils/tagSuggestions"
import RemovableChip from "./RemovableChip"
import Button from "./ui/Button"
import { TrashIcon } from "./ui/icons"

type Props = {
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
  pins: Pin[]
  linkedPinIds?: number[]
  onAddLinkedPin?: (pinId: number) => void
  onRemoveLinkedPin?: (pinId: number) => void
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
  locationAlreadySetFromPlacement = false,
  pinType,
  csrfToken,
  pinId = null,
  title, setTitle,
  description, setDescription,
  tags, setTags,
  pins = [],
  linkedPinIds = [],
  onAddLinkedPin,
  onRemoveLinkedPin,
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
  const availableTags = useMemo(() => deriveMapTags(pins), [pins])
  const isTimeOnly = isTimeOnlyBuiltinPinType(pinType)
  const isFoodBank = pinType === BuiltinPinType.FoodBank
  const isOther = pinType === BuiltinPinType.Other
  const isCustom = isCustomPinType(pinType)
  const customType = isCustom ? findCustomPinType(pinType, catalog) : undefined
  const showTimeFields = !isOther && !isCustom && !(isFoodBank && open24_7)

  const handleAddTag = (newTag: string) => {
    const trimmed = newTag.trim()
    if (!trimmed) return
    const lower = trimmed.toLowerCase()
    if (tags.some((t) => t.toLowerCase() === lower)) return
    setTags([...tags, trimmed])
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const formatCoord = (n: number) => n.toFixed(5)

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      document.getElementById("pin-title")?.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [])

  return (
    <div className="pin-modal-content w-full">
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
        className="input input-bordered w-full mb-4"
      />
      <label htmlFor="pin-description" className="block font-medium mb-1">Description</label>
      <textarea
        id="pin-description"
        name="description"
        placeholder="Description… (example.com or [label](url))"
        autoComplete="off"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="textarea textarea-bordered w-full mb-4"
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
          <Button type="button" size="sm" variant="ghost" onClick={onStartPickOnMap}>
            {(locationAlreadySetFromPlacement || mode === "edit") ? "Change location on map" : "Set location on map"}
          </Button>
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
            className="input input-bordered w-full mb-2"
          />
          <label htmlFor="pin-end-time" className="block font-medium mb-1">End Time</label>
          <input
            id="pin-end-time"
            name="end_time"
            type={isTimeOnly ? "time" : "datetime-local"}
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            className="input input-bordered w-full mb-2"
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
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <RemovableChip
                key={tag}
                removeLabel={`Remove tag: ${tag}`}
                onRemove={() => handleRemoveTag(tag)}
              >
                <span className="min-w-0 truncate pl-0.5">{tag}</span>
              </RemovableChip>
            ))}
          </div>
        )}
        <TagCombobox
          inputId="pin-tag-input"
          availableTags={availableTags}
          excludeTags={tags}
          omitCommunityTags
          allowCreate
          onSelect={handleAddTag}
          placeholder="Add tag…"
        />
      </div>
      <RelatedPinsEditor
        pins={pins}
        linkedPinIds={linkedPinIds}
        currentPinId={pinId ?? undefined}
        onAddLinkedPin={onAddLinkedPin}
        onRemoveLinkedPin={onRemoveLinkedPin}
      />
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
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        {mode === "edit" && canDelete && (
          <Button
            type="button"
            variant="danger"
            onClick={onDelete}
            disabled={saving}
            className="inline-flex items-center gap-1.5"
          >
            <TrashIcon className="size-4" />
            Delete
          </Button>
        )}
        <Button type="button" variant="primary" onClick={onSave} disabled={saving}>
          {saving ? (mode === "edit" ? "Saving…" : "Adding…") : (mode === "edit" ? "Save Pin" : "Add Pin")}
        </Button>
      </div>
    </div>
  )
}
