import React, { useCallback, useEffect, useMemo, useRef, useState, type Dispatch } from "react"
import MapCanvas from "./components/MapCanvas"
import CommunityMapToolbar from "./components/CommunityMapToolbar"
import MapShell from "./components/MapShell"
import PinFlowUI from "./components/PinFlowUI"
import PinTypeLegend from "./components/PinTypeLegend"
import RecentPinsRail from "./components/RecentPinsRail"
import TimedPinsRail from "./components/TimedPinsRail"
import LoginRequiredModal from "./components/LoginRequiredModal"
import WelcomeModal from "./components/WelcomeModal"
import ErrorToast from "./components/ErrorToast"
import ConfirmDialog from "./components/ui/ConfirmDialog"
import Button from "./components/ui/Button"
import { SubMapProvider } from "./context/SubMapContext"
import { PinTypesProvider } from "./context/PinTypesContext"
import { usePinWorkflow } from "./hooks/usePinWorkflow"
import { usePinHearts } from "./hooks/usePinHearts"
import { useIsDesktop } from "./hooks/useMediaQuery"
import { useMapScope } from "./hooks/useMapScope"
import { useMapData } from "./hooks/useMapData"
import { PIN_FOCUS_ZOOM, type PinFocusIntent } from "./hooks/mapHookTypes"
import type { PinType } from "./types"
import type { PinWorkflowAction } from "./pinWorkflow/types"
import { CLEARED_FILTER, filterPins } from "./components/map/filters"
import { canChooseWorldVisibility } from "./utils/subMapForm"
import { mapPageFixedBottom } from "./utils/siteLayout"
import { useContentOverlayOpen } from "./utils/contentOverlay"
import { syncMapPinSearch } from "./mapRoute"
import { takeLastVisitWatermark } from "./utils/mapLastVisit"
import { listRecentPins } from "./utils/recentPins"
import {
  listTimedPinsInView,
  type MapBounds,
} from "./utils/pinScheduleSummary"
import { shouldApplyFocusIntent } from "./pinFocusIntent"
import * as api from "./api/client"
import { GardenCopy } from "./utils/gardenCopy"

type Props = {
  userId?: number
  userMuted?: boolean
  csrfToken?: string
  styleUrl?: string
  communityUrl?: string
}

const WELCOME_SEEN_STORAGE_KEY = "mapgarden:welcomeSeenV1"

export default function App({ userId, userMuted = false, csrfToken, styleUrl = "/api/map/style", communityUrl: datasetCommunityUrl }: Props) {
  const isDesktop = useIsDesktop()
  const contentOverlayOpen = useContentOverlayOpen()
  const onScopeChangeRef = useRef<Dispatch<PinWorkflowAction> | null>(null)
  const onScopeChange = useCallback(() => {
    onScopeChangeRef.current?.({ type: "close_all" })
  }, [])

  const {
    communityUrl,
    onSelectCommunity,
    focusIntent,
    consumeFocusIntent,
    historyCloseSeq,
    navigateToPin,
    resolvingPinIdsRef,
  } = useMapScope({ datasetCommunityUrl })

  const {
    pins,
    subMap,
    pinTypes,
    filter,
    setFilter,
    loading,
    mapInitialized,
    apiError,
    setApiError,
    updateOrAddPin,
    setPins,
    refreshCatalog,
  } = useMapData({
    communityUrl,
    onScopeChange,
    navigateToPin,
    resolvingPinIdsRef,
    focusIntent,
  })

  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!infoMessage) return
    const t = window.setTimeout(() => setInfoMessage(null), 4000)
    return () => window.clearTimeout(t)
  }, [infoMessage])

  const { heartedPinIds, isHearted, toggleHeart, loading: pinHeartsLoading, loadError: pinHeartsLoadError } =
    usePinHearts(userId, csrfToken)

  const handleTogglePinHeart = useCallback(
    async (pinId: number) => {
      try {
        return await toggleHeart(pinId)
      } catch {
        setApiError(GardenCopy.couldNotUpdateClipping)
        return { needsLogin: false as const }
      }
    },
    [toggleHeart, setApiError],
  )

  const workflow = usePinWorkflow({
    userId,
    userMuted,
    csrfToken,
    communityUrl,
    subMap,
    catalog: pinTypes,
    showPromoteToWorld: canChooseWorldVisibility(subMap),
    pins,
    isDesktop,
    updateOrAddPin,
    setPins,
    setApiError,
    setInfoMessage,
  })

  const {
    modal,
    placement,
    timeError,
    formError,
    dispatch,
    onMapClick,
    onView,
    onCloseView,
    onDelete,
    pendingDeletePinId,
    cancelPendingDelete,
    confirmPendingDelete,
    pendingNearLocationSave,
    cancelNearLocationSave,
    confirmNearLocationSave,
    saving,
    pendingLocation,
    pendingPinType,
    editingPinId,
    detailPinId,
    showViewDetail,
    showDesktopPanel,
    onPlacementMapClick,
  } = workflow
  onScopeChangeRef.current = dispatch

  const [showWelcome, setShowWelcome] = useState(false)
  const legendCloseRef = useRef<{ close(): void } | null>(null)
  const [cameraRequest, setCameraRequest] = useState<PinFocusIntent | null>(null)
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null)
  const [filtersEditorOpen, setFiltersEditorOpen] = useState(false)
  const [bloomMinimized, setBloomMinimized] = useState(false)
  const [recentMinimized, setRecentMinimized] = useState(false)
  const lastAppliedFocusTokenRef = useRef(0)
  const lastHistoryCloseSeqRef = useRef(0)
  const cameraTokenRef = useRef(1_000_000)

  const mapScopeKey = communityUrl ?? "world"
  const lastVisitWatermark = useMemo(
    () => takeLastVisitWatermark(mapScopeKey),
    [mapScopeKey],
  )

  const timedPinsInView = useMemo(
    () => listTimedPinsInView(pins, mapBounds),
    [pins, mapBounds],
  )
  const recentPins = useMemo(() => {
    const matching = filterPins(pins, filter, pinTypes, heartedPinIds)
    const excludeIds = new Set(timedPinsInView.map((pin) => pin.id))
    return listRecentPins(matching, { excludeIds })
  }, [pins, filter, pinTypes, heartedPinIds, timedPinsInView])

  const showDiscoveryColumn =
    isDesktop && !showDesktopPanel && placement == null && !filtersEditorOpen
  const showTimedPinsRail = showDiscoveryColumn && timedPinsInView.length > 0
  const showRecentPinsRail = showDiscoveryColumn && recentPins.length > 0

  const onMapBoundsChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds)
  }, [])

  useEffect(() => {
    setMapBounds(null)
  }, [communityUrl])

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(WELCOME_SEEN_STORAGE_KEY)
      if (!seen) setShowWelcome(true)
    } catch {
      // ignore
    }
  }, [])

  const closeWelcome = useCallback(() => {
    setShowWelcome(false)
    try {
      window.localStorage.setItem(WELCOME_SEEN_STORAGE_KEY, "1")
    } catch {
      // ignore
    }
  }, [])

  const openWelcome = useCallback(() => setShowWelcome(true), [])

  const handleNavigateToPin = useCallback(
    (pinId: number) => navigateToPin(pinId, pins),
    [navigateToPin, pins],
  )

  useEffect(() => {
    if (modal === null) setApiError(null)
  }, [modal, setApiError])

  const syncPinUrl = useCallback((pinId: number | null) => {
    // Address bar only — never creates a focus intent (avoids MapCanvas ↔ detail races).
    syncMapPinSearch(pinId)
  }, [])

  const onOpenPin = useCallback((pinId: number) => {
    legendCloseRef.current?.close()
    onView(pinId)
  }, [onView])

  const onOpenListedPin = useCallback((pinId: number) => {
    legendCloseRef.current?.close()
    onView(pinId)
    cameraTokenRef.current += 1
    setCameraRequest({ pinId, token: cameraTokenRef.current, minZoom: PIN_FOCUS_ZOOM })
  }, [onView])

  useEffect(() => {
    if (contentOverlayOpen) dispatch({ type: "close_all" })
  }, [contentOverlayOpen, dispatch])

  // Apply one-shot focus intent into workflow + camera (not via MapCanvas selectPin).
  useEffect(() => {
    if (!shouldApplyFocusIntent(
      focusIntent,
      lastAppliedFocusTokenRef.current,
      loading,
      focusIntent != null && pins.some((p) => p.id === focusIntent.pinId),
    )) {
      return
    }
    if (focusIntent == null) return

    lastAppliedFocusTokenRef.current = focusIntent.token
    setFilter(CLEARED_FILTER)
    legendCloseRef.current?.close()
    onView(focusIntent.pinId)
    setCameraRequest(focusIntent)
    consumeFocusIntent()
  }, [focusIntent, loading, pins, onView, setFilter, consumeFocusIntent])

  useEffect(() => {
    if (historyCloseSeq === lastHistoryCloseSeqRef.current) return
    lastHistoryCloseSeqRef.current = historyCloseSeq
    if (historyCloseSeq > 0) onCloseView()
  }, [historyCloseSeq, onCloseView])

  const prevDetailPinIdRef = useRef<number | null>(null)
  useEffect(() => {
    if (detailPinId != null) {
      syncPinUrl(detailPinId)
    } else if (prevDetailPinIdRef.current != null) {
      syncPinUrl(null)
    }
    prevDetailPinIdRef.current = detailPinId
  }, [detailPinId, syncPinUrl])

  const handleTagFilter = useCallback((tag: string) => {
    setFilter((f) => ({ ...f, tag }))
    onCloseView()
  }, [setFilter, onCloseView])

  const toggleMapPinTypeFilter = useCallback((pinType: PinType) => {
    setFilter((f) => ({ ...f, pinType: f.pinType === pinType ? null : pinType }))
  }, [setFilter])

  const refreshSubMap = refreshCatalog

  const onJoinCommunity = useCallback(async () => {
    if (!communityUrl) return
    try {
      await api.joinSubMap(csrfToken, communityUrl)
      await refreshSubMap()
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to join community.")
    }
  }, [communityUrl, csrfToken, refreshSubMap, setApiError])

  const onLeaveCommunity = useCallback(async () => {
    if (!communityUrl) return
    try {
      await api.leaveSubMap(csrfToken, communityUrl)
      await refreshSubMap()
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to leave community.")
    }
  }, [communityUrl, csrfToken, refreshSubMap, setApiError])

  return (
    <PinTypesProvider catalog={pinTypes}>
      <SubMapProvider
        subMap={subMap}
        refreshSubMap={refreshSubMap}
        onJoin={onJoinCommunity}
        onLeave={onLeaveCommunity}
      >
        <div className="w-full h-full">
          <MapShell
            chrome={
              subMap ? (
                <CommunityMapToolbar
                  subMap={subMap}
                  userId={userId}
                  onJoin={onJoinCommunity}
                  onLeave={onLeaveCommunity}
                />
              ) : undefined
            }
          >
            {(mapInitialized || !loading) && (
              <>
                <MapCanvas
                  mapScopeKey={communityUrl ?? "world"}
                  styleUrl={styleUrl}
                  mapBackgroundColor={subMap?.color}
                  pins={pins}
                  cameraRequest={cameraRequest}
                  onCameraRequestConsumed={() => setCameraRequest(null)}
                  isDesktop={isDesktop}
                  detailPinId={detailPinId}
                  placementActive={placement != null}
                  onMapClick={onMapClick}
                  onOpenPin={onOpenPin}
                  onMapBoundsChange={onMapBoundsChange}
                  onDismissPinDetail={showViewDetail ? onCloseView : undefined}
                  pendingLocation={pendingLocation}
                  pendingPinType={pendingPinType}
                  editingPinId={editingPinId}
                  onPlacementMapClick={placement ? onPlacementMapClick : undefined}
                  filter={filter}
                  setFilter={setFilter}
                  userId={userId}
                  onNavigateToPin={handleNavigateToPin}
                  heartedPinIds={heartedPinIds}
                  pinHeartsLoading={pinHeartsLoading}
                  onFiltersExpandedChange={setFiltersEditorOpen}
                  topRightRail={
                    showTimedPinsRail || showRecentPinsRail ? (
                      <>
                        {showTimedPinsRail ? (
                          <TimedPinsRail
                            pins={timedPinsInView}
                            onOpenPin={onOpenListedPin}
                            shareColumn={showRecentPinsRail && !recentMinimized}
                            aboveCollapsedSibling={showRecentPinsRail && recentMinimized}
                            minimized={bloomMinimized}
                            onToggleMinimized={() => setBloomMinimized((current) => !current)}
                          />
                        ) : null}
                        {showRecentPinsRail ? (
                          <RecentPinsRail
                            pins={recentPins}
                            onOpenPin={onOpenListedPin}
                            lastVisitWatermark={lastVisitWatermark}
                            minimized={recentMinimized}
                            onToggleMinimized={() => setRecentMinimized((current) => !current)}
                          />
                        ) : null}
                      </>
                    ) : null
                  }
                />
                {!contentOverlayOpen && (
                  <PinTypeLegend
                    closeRef={legendCloseRef}
                    selectedPinType={filter.pinType}
                    onTogglePinType={toggleMapPinTypeFilter}
                  />
                )}
                {loading && mapInitialized && (
                  <div
                    className="absolute inset-0 z-10 flex items-center justify-center bg-base-100/20 pointer-events-none"
                    aria-live="polite"
                    aria-busy="true"
                  >
                    <span className="loading loading-spinner loading-md text-primary" />
                  </div>
                )}
              </>
            )}
          </MapShell>
          {modal?.mode === "login-required" && !contentOverlayOpen && (
            <LoginRequiredModal onClose={() => dispatch({ type: "close_all" })} />
          )}

          {showWelcome && !contentOverlayOpen && <WelcomeModal onClose={closeWelcome} />}

          <ConfirmDialog
            open={!contentOverlayOpen && pendingDeletePinId != null}
            title={GardenCopy.uprootConfirmTitle}
            body="This cannot be undone."
            confirmLabel={GardenCopy.uproot}
            confirming={saving && pendingDeletePinId != null}
            onCancel={cancelPendingDelete}
            onConfirm={() => void confirmPendingDelete()}
          />

          <ConfirmDialog
            open={!contentOverlayOpen && pendingNearLocationSave != null}
            tone="warning"
            title={GardenCopy.nearLocationTitle}
            body={GardenCopy.nearLocationBody}
            confirmLabel="Post anyway"
            confirmingLabel={GardenCopy.planting}
            confirming={saving && pendingNearLocationSave != null}
            onCancel={cancelNearLocationSave}
            onConfirm={() => void confirmNearLocationSave()}
          />

          {!contentOverlayOpen && placement == null && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={openWelcome}
              aria-label="Open help"
              title="Help"
              className="fixed right-3 z-30 size-8 min-h-8 p-0 rounded-full bg-base-100/90 border border-solid border-base-300 shadow hover:bg-base-200"
              style={{ bottom: mapPageFixedBottom() }}
            >
              ?
            </Button>
          )}

          {!contentOverlayOpen && (
            <PinFlowUI
              isDesktop={isDesktop}
              workflow={workflow}
              communityUrl={communityUrl}
              userId={userId}
              userMuted={userMuted}
              onSelectCommunity={onSelectCommunity}
              onNavigateToPin={handleNavigateToPin}
              onTagFilter={handleTagFilter}
              isPinHearted={isHearted}
              onTogglePinHeart={handleTogglePinHeart}
            />
          )}

          {!contentOverlayOpen && timeError && <ErrorToast message={timeError} prefix="⏰ " />}
          {!contentOverlayOpen && formError && <ErrorToast message={formError} />}
          {!contentOverlayOpen && apiError && <ErrorToast message={apiError} />}
          {!contentOverlayOpen && infoMessage && <ErrorToast message={infoMessage} tone="info" />}
          {!contentOverlayOpen && pinHeartsLoadError && <ErrorToast message={pinHeartsLoadError} />}
        </div>
      </SubMapProvider>
    </PinTypesProvider>
  )
}
