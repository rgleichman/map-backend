import React from "react"
import PinModal from "./PinModal"
import type { PinType } from "../types"
import type { PinWorkflowAction } from "../pinWorkflow/types"

type Props = {
  layout: "modal" | "panel"
  locationAlreadySetFromPlacement?: boolean
  mode: "add" | "edit"
  csrfToken?: string
  pinId?: number | null
  pinType: PinType
  title: string
  description: string
  tags: string[]
  startTime: string
  endTime: string
  scheduleRrule: string
  scheduleTimezone: string
  open24_7: boolean
  visibleOnWorldMap: boolean
  customData: Record<string, unknown>
  showPromoteToWorld: boolean
  latitude: number
  longitude: number
  dispatch: React.Dispatch<PinWorkflowAction>
  onStartPickOnMap: () => void
  onCancel: () => void
  onSave: () => void
  onDelete?: () => void
  canDelete?: boolean
  saving?: boolean
}

export default function PinComposer({
  layout,
  locationAlreadySetFromPlacement,
  mode,
  csrfToken,
  pinId,
  pinType,
  title,
  description,
  tags,
  startTime,
  endTime,
  scheduleRrule,
  scheduleTimezone,
  open24_7,
  visibleOnWorldMap,
  customData,
  showPromoteToWorld,
  latitude,
  longitude,
  dispatch,
  onStartPickOnMap,
  onCancel,
  onSave,
  onDelete,
  canDelete,
  saving,
}: Props) {
  return (
    <PinModal
      layout={layout}
      locationAlreadySetFromPlacement={locationAlreadySetFromPlacement}
      pinType={pinType}
      csrfToken={csrfToken}
      pinId={pinId}
      title={title}
      setTitle={(t) => dispatch({ type: "set_title", title: t })}
      description={description}
      setDescription={(d) => dispatch({ type: "set_description", description: d })}
      tags={tags}
      setTags={(ts) => dispatch({ type: "set_tags", tags: ts })}
      startTime={startTime}
      setStartTime={(t) => dispatch({ type: "set_start_time", startTime: t })}
      endTime={endTime}
      setEndTime={(t) => dispatch({ type: "set_end_time", endTime: t })}
      scheduleRrule={scheduleRrule}
      setScheduleRrule={(s) => dispatch({ type: "set_schedule_rrule", scheduleRrule: s })}
      scheduleTimezone={scheduleTimezone}
      setScheduleTimezone={(s) => dispatch({ type: "set_schedule_timezone", scheduleTimezone: s })}
      open24_7={open24_7}
      setOpen24_7={(v) => dispatch({ type: "set_open_24_7", open24_7: v })}
      showPromoteToWorld={showPromoteToWorld}
      promoteToWorld={visibleOnWorldMap}
      setPromoteToWorld={(v) => dispatch({ type: "set_visible_on_world_map", visibleOnWorldMap: v })}
      customData={customData}
      setCustomData={(customData) => dispatch({ type: "set_custom_data", customData })}
      latitude={latitude}
      longitude={longitude}
      onStartPickOnMap={onStartPickOnMap}
      mode={mode}
      onCancel={onCancel}
      onSave={onSave}
      onDelete={onDelete}
      canDelete={canDelete}
      saving={saving}
    />
  )
}
