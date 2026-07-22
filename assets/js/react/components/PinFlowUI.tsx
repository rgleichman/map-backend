import React, { useId } from "react"
import PinComposer from "./PinComposer"
import PinOverlay from "./PinOverlay"
import PinTypeModal from "./PinTypeModal"
import PinDetailView from "./map/PinDetailView"
import { useSubMap } from "../context/SubMapContext"
import type { PinWorkflow } from "../hooks/usePinWorkflow"
import type { ToggleHeartResult } from "../types"
import { DEFAULT_BUILTIN_PIN_TYPE } from "../utils/builtinPinType"
import Button from "./ui/Button"

type Props = {
  isDesktop: boolean
  workflow: PinWorkflow
  communityUrl?: string
  userId?: number
  userMuted?: boolean
  onSelectCommunity?: (communityUrl: string) => void
  onNavigateToPin?: (pinId: number) => void
  onTagFilter?: (tag: string) => void
  isPinHearted?: (pinId: number) => boolean
  onTogglePinHeart?: (pinId: number) => Promise<ToggleHeartResult>
}

function pinOverlayLabel(mode: string | undefined): string {
  switch (mode) {
    case "select-type":
      return "Choose pin type"
    case "view":
      return "Pin details"
    case "edit":
      return "Edit pin"
    case "add":
      return "Add pin"
    default:
      return "Pin"
  }
}

export default function PinFlowUI({
  isDesktop,
  workflow,
  communityUrl,
  userId,
  userMuted,
  onSelectCommunity,
  onNavigateToPin,
  onTagFilter,
  isPinHearted,
  onTogglePinHeart,
}: Props) {
  const { showPromoteToWorld } = useSubMap()
  const viewHeadingId = useId()
  const {
    csrfToken,
    modal,
    placement,
    dispatch,
    saving,
    onSelectPinType,
    onStartPickOnMap,
    onSave,
    onEdit,
    onDelete,
    onCancelEdit,
    onCloseView,
    canDelete,
    showPlacementOverlay,
    showEditForm,
    showAddForm,
    showViewDetail,
    showDesktopPanel,
    pinModalLat,
    pinModalLng,
    locationAlreadySetFromPlacement,
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
    linkedPinIds,
    pins,
  } = workflow

  const composerProps = modal && (modal.mode === "add" || modal.mode === "edit") ? {
    csrfToken,
    pinId: modal.mode === "edit" ? modal.pin.id : null,
    pinType: modal.mode === "add" ? (pinType ?? DEFAULT_BUILTIN_PIN_TYPE) : modal.pin.pin_type,
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
    linkedPinIds,
    pins,
    showPromoteToWorld,
    latitude: pinModalLat,
    longitude: pinModalLng,
    dispatch,
    onStartPickOnMap,
    mode: modal.mode,
    onCancel: modal.mode === "edit" ? onCancelEdit : onCloseView,
    onSave,
    onDelete: modal.mode === "edit" ? () => onDelete(modal.pin.id) : undefined,
    canDelete,
    saving,
  } : null

  const viewPin = modal?.mode === "view" ? modal.pin : null

  const detailView = viewPin ? (
    <PinDetailView
      pin={viewPin}
      pins={pins}
      csrfToken={csrfToken}
      userId={userId}
      userMuted={userMuted}
      communityUrl={communityUrl}
      onSelectCommunity={onSelectCommunity}
      onNavigateToPin={onNavigateToPin}
      onTagFilter={onTagFilter}
      onEdit={onEdit}
      onDelete={onDelete}
      onClose={onCloseView}
      hearted={isPinHearted?.(viewPin.id) ?? false}
      onToggleHeart={
        onTogglePinHeart ? () => onTogglePinHeart(viewPin.id) : undefined
      }
    />
  ) : null

  const showComposer =
    !!composerProps &&
    (isDesktop ||
      (showAddForm && modal?.mode === "add") ||
      (showEditForm && modal?.mode === "edit"))

  const showMobileOverlay =
    !isDesktop &&
    (modal?.mode === "select-type" ||
      showComposer ||
      (showViewDetail && !!detailView))

  const showOverlay = showDesktopPanel || showMobileOverlay

  const overlayBody = showOverlay ? (
    <>
      {modal?.mode === "select-type" && (
        <PinTypeModal onSelectType={onSelectPinType} onCancel={onCloseView} />
      )}
      {showComposer && composerProps && (
        <PinComposer
          locationAlreadySetFromPlacement={locationAlreadySetFromPlacement}
          {...composerProps}
        />
      )}
      {detailView}
      {modal?.mode === "view" ? (
        <span id={viewHeadingId} className="sr-only">
          Pin details
        </span>
      ) : null}
    </>
  ) : null

  return (
    <>
      {showOverlay && overlayBody ? (
        <PinOverlay
          variant={isDesktop ? "panel" : "modal"}
          onClose={modal?.mode === "edit" ? onCancelEdit : onCloseView}
          aria-label={
            modal?.mode === "select-type" || modal?.mode === "view"
              ? undefined
              : pinOverlayLabel(modal?.mode)
          }
          aria-labelledby={
            modal?.mode === "select-type"
              ? "pin-type-modal-title"
              : modal?.mode === "view"
                ? viewHeadingId
                : undefined
          }
        >
          {overlayBody}
        </PinOverlay>
      ) : null}

      {showPlacementOverlay && placement && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-base-100/95 border-t border-base-300 shadow-lg">
          <div className="mx-auto w-full max-w-md flex gap-2 justify-center">
            {placement.intent === "add" ? (
              modal?.mode === "add" ? (
                <>
                  <Button type="button" variant="ghost" onClick={() => dispatch({ type: "set_placement", placement: null })}>Cancel</Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      if (!placement || placement.intent !== "add") return
                      dispatch({ type: "set_add_location", lat: placement.lat, lng: placement.lng })
                      dispatch({ type: "set_placement", placement: null })
                    }}
                  >
                    Confirm
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="ghost" onClick={() => dispatch({ type: "set_placement", placement: null })}>Cancel</Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      if (!placement || placement.intent !== "add") return
                      dispatch({ type: "set_add_location", lat: placement.lat, lng: placement.lng })
                      dispatch({ type: "open_select_type", lat: placement.lat, lng: placement.lng, resetDraft: false })
                    }}
                  >
                    Create pin
                  </Button>
                </>
              )
            ) : (
              <>
                <Button type="button" variant="ghost" onClick={() => dispatch({ type: "set_placement", placement: null })}>Cancel</Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    if (!placement || placement.intent !== "edit") return
                    dispatch({ type: "set_edit_location", lat: placement.lat, lng: placement.lng })
                    dispatch({ type: "set_placement", placement: null })
                  }}
                >
                  Confirm
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
