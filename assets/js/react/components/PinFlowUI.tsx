import React from "react"
import PinComposer from "./PinComposer"
import PinTypeModal from "./PinTypeModal"
import { useSubMap } from "../context/SubMapContext"
import type { PinWorkflow } from "../hooks/usePinWorkflow"
import { SITE_HEADER_FIXED_PANEL_CLASSES } from "../utils/siteLayout"

type Props = {
  isDesktop: boolean
  workflow: PinWorkflow
}

export default function PinFlowUI({ isDesktop, workflow }: Props) {
  const { showPromoteToWorld } = useSubMap()
  const {
    modal,
    placement,
    dispatch,
    saving,
    onSelectPinType,
    onStartPickOnMap,
    onSave,
    onDelete,
    canDelete,
    showPlacementOverlay,
    showEditForm,
    showAddForm,
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
  } = workflow

  const composerProps = modal && (modal.mode === "add" || modal.mode === "edit") ? {
    pinType: modal.mode === "add" ? (pinType ?? "one_time") : modal.pin.pin_type,
    title,
    description,
    tags,
    startTime,
    endTime,
    scheduleRrule,
    scheduleTimezone,
    open24_7,
    visibleOnWorldMap,
    showPromoteToWorld,
    latitude: pinModalLat,
    longitude: pinModalLng,
    dispatch,
    onStartPickOnMap,
    mode: modal.mode,
    onCancel: () => dispatch({ type: "close_all" }),
    onSave,
    onDelete: modal.mode === "edit" ? () => onDelete(modal.pin.id) : undefined,
    canDelete,
    saving,
  } : null

  return (
    <>
      {isDesktop && !placement && modal && (modal.mode === "select-type" || modal.mode === "add" || modal.mode === "edit") && (
        <div className={`fixed right-0 w-full max-w-md bg-base-100 border-l border-base-300 shadow-xl z-40 flex flex-col overflow-hidden ${SITE_HEADER_FIXED_PANEL_CLASSES}`}>
          <div className="p-4 overflow-y-auto flex-1">
            {modal.mode === "select-type" && (
              <PinTypeModal
                layout="panel"
                onSelectType={onSelectPinType}
                onCancel={() => dispatch({ type: "close_all" })}
              />
            )}
            {composerProps && (
              <PinComposer layout="panel" {...composerProps} />
            )}
          </div>
        </div>
      )}

      {showPlacementOverlay && placement && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-base-100/95 border-t border-base-300 shadow-lg">
          <div className="mx-auto w-full max-w-md flex gap-2 justify-center">
            {placement.intent === "add" ? (
              modal?.mode === "add" ? (
                <>
                  <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: "set_placement", placement: null })}>Cancel</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      if (!placement || placement.intent !== "add") return
                      dispatch({ type: "set_add_location", lat: placement.lat, lng: placement.lng })
                      dispatch({ type: "set_placement", placement: null })
                    }}
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: "set_placement", placement: null })}>Cancel</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      if (!placement || placement.intent !== "add") return
                      dispatch({ type: "set_add_location", lat: placement.lat, lng: placement.lng })
                      dispatch({ type: "open_select_type", lat: placement.lat, lng: placement.lng, resetDraft: false })
                    }}
                  >
                    Create pin
                  </button>
                </>
              )
            ) : (
              <>
                <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: "set_placement", placement: null })}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (!placement || placement.intent !== "edit") return
                    dispatch({ type: "set_edit_location", lat: placement.lat, lng: placement.lng })
                    dispatch({ type: "set_placement", placement: null })
                  }}
                >
                  Confirm
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {!isDesktop && modal?.mode === "select-type" && (
        <PinTypeModal
          layout="modal"
          onSelectType={onSelectPinType}
          onCancel={() => dispatch({ type: "close_all" })}
        />
      )}
      {!isDesktop && composerProps && ((showAddForm && modal?.mode === "add") || (showEditForm && modal?.mode === "edit")) && (
        <PinComposer
          layout="modal"
          locationAlreadySetFromPlacement={locationAlreadySetFromPlacement}
          {...composerProps}
        />
      )}
    </>
  )
}
