import React, { useId } from "react"
import PinComposer from "./PinComposer"
import PinTypeModal from "./PinTypeModal"
import PinDetailView from "./map/PinDetailView"
import { useSubMap } from "../context/SubMapContext"
import type { PinWorkflow } from "../hooks/usePinWorkflow"
import type { ToggleHeartResult } from "../types"
import { DEFAULT_BUILTIN_PIN_TYPE } from "../utils/builtinPinType"
import {
  DESKTOP_PIN_PANEL_CLASSES,
  desktopPinPanelFloatingStyle,
  PIN_FLOATING_CARD_CLASSES,
} from "../utils/siteLayout"
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

  return (
    <>
      {showDesktopPanel && (
        <div className={DESKTOP_PIN_PANEL_CLASSES} style={desktopPinPanelFloatingStyle()}>
          <div className="p-4 overflow-y-auto flex-1">
            {modal?.mode === "select-type" && (
              <PinTypeModal
                layout="panel"
                onSelectType={onSelectPinType}
                onCancel={onCloseView}
              />
            )}
            {composerProps && (
              <PinComposer layout="panel" {...composerProps} />
            )}
            {detailView}
          </div>
        </div>
      )}

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

      {!isDesktop && modal?.mode === "select-type" && (
        <PinTypeModal
          layout="modal"
          onSelectType={onSelectPinType}
          onCancel={onCloseView}
        />
      )}
      {!isDesktop && composerProps && ((showAddForm && modal?.mode === "add") || (showEditForm && modal?.mode === "edit")) && (
        <PinComposer
          layout="modal"
          locationAlreadySetFromPlacement={locationAlreadySetFromPlacement}
          {...composerProps}
        />
      )}
      {!isDesktop && showViewDetail && detailView ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={viewHeadingId}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCloseView()
          }}
        >
          <div className={`${PIN_FLOATING_CARD_CLASSES} w-full max-w-md max-h-[90vh] overflow-y-auto p-4`}>
            <span id={viewHeadingId} className="sr-only">
              Pin details
            </span>
            {detailView}
          </div>
        </div>
      ) : null}
    </>
  )
}
