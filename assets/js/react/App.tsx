import React, { useCallback, useEffect, useRef, useState, type Dispatch } from "react"
import MapCanvas from "./components/MapCanvas"
import CommunityMapToolbar from "./components/CommunityMapToolbar"
import MapShell from "./components/MapShell"
import PinFlowUI from "./components/PinFlowUI"
import PinTypeLegend from "./components/PinTypeLegend"
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
import type { PinType } from "./types"
import type { PinWorkflowAction } from "./pinWorkflow/types"
import { canChooseWorldVisibility } from "./utils/subMapForm"
import { mapPageFixedBottom } from "./utils/siteLayout"
import * as api from "./api/client"

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
  const onScopeChangeRef = useRef<Dispatch<PinWorkflowAction> | null>(null)
  const onScopeChange = useCallback(() => {
    onScopeChangeRef.current?.({ type: "close_all" })
  }, [])

  const {
    communityUrl,
    onSelectWorld,
    onSelectCommunity,
    initialPinId,
    pinFocusSeq,
    navigateToPin,
    resolvingPinIdsRef,
    setInitialPinId,
  } = useMapScope({ datasetCommunityUrl })

  const {
    pins,
    subMap,
    setSubMap,
    customPinTypes,
    enabledBuiltinTypes,
    filter,
    setFilter,
    loading,
    mapInitialized,
    apiError,
    setApiError,
    updateOrAddPin,
    setPins,
  } = useMapData({
    communityUrl,
    setInitialPinId,
    onScopeChange,
    navigateToPin,
    resolvingPinIdsRef,
    initialPinId,
  })

  const { heartedPinIds, isHearted, toggleHeart, loading: pinHeartsLoading, loadError: pinHeartsLoadError } =
    usePinHearts(userId, csrfToken)

  const handleTogglePinHeart = useCallback(
    async (pinId: number) => {
      try {
        return await toggleHeart(pinId)
      } catch {
        setApiError("Could not update saved pin.")
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
    catalog: customPinTypes,
    showPromoteToWorld: canChooseWorldVisibility(subMap),
    pins,
    isDesktop,
    updateOrAddPin,
    setPins,
    setApiError,
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
    saving,
    pendingLocation,
    pendingPinType,
    editingPinId,
    detailPinId,
    showViewDetail,
    onPlacementMapClick,
  } = workflow
  onScopeChangeRef.current = dispatch

  const [showWelcome, setShowWelcome] = useState(false)
  const legendCloseRef = useRef<{ close(): void } | null>(null)

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
    const path = window.location.pathname || "/map"
    if (pinId == null) {
      setInitialPinId(null)
      window.history.replaceState(null, "", path)
      return
    }
    // Only update the address bar. Do not setInitialPinId here — that races the
    // MapCanvas deep-link effect against detailPinId and can flip between pins.
    window.history.replaceState(null, "", `${path}?pin=${pinId}`)
  }, [setInitialPinId])

  const onOpenPin = useCallback((pinId: number) => {
    legendCloseRef.current?.close()
    onView(pinId)
  }, [onView])

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

  const refreshSubMap = useCallback(async () => {
    if (!communityUrl) return
    const { data } = await api.getSubMap(communityUrl)
    setSubMap(data)
  }, [communityUrl, setSubMap])

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
    <PinTypesProvider catalog={customPinTypes} enabledBuiltins={enabledBuiltinTypes}>
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
                  onSelectWorld={onSelectWorld}
                />
              ) : undefined
            }
          >
            {(mapInitialized || !loading) && (
              <>
                <MapCanvas
                  mapScopeKey={communityUrl ?? "world"}
                  styleUrl={styleUrl}
                  pins={pins}
                  initialPinId={initialPinId}
                  pinFocusSeq={pinFocusSeq}
                  isDesktop={isDesktop}
                  detailPinId={detailPinId}
                  hideMiniPopup={placement != null}
                  onMapClick={onMapClick}
                  onOpenPin={onOpenPin}
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
                />
                <PinTypeLegend
                  closeRef={legendCloseRef}
                  selectedPinType={filter.pinType}
                  onTogglePinType={toggleMapPinTypeFilter}
                />
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
          {modal?.mode === "login-required" && (
            <LoginRequiredModal onClose={() => dispatch({ type: "close_all" })} />
          )}

          {showWelcome && <WelcomeModal onClose={closeWelcome} />}

          <ConfirmDialog
            open={pendingDeletePinId != null}
            title="Delete this pin?"
            body="This cannot be undone."
            confirming={saving && pendingDeletePinId != null}
            onCancel={cancelPendingDelete}
            onConfirm={() => void confirmPendingDelete()}
          />

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

          {timeError && <ErrorToast message={timeError} prefix="⏰ " />}
          {formError && <ErrorToast message={formError} />}
          {apiError && <ErrorToast message={apiError} />}
          {pinHeartsLoadError && <ErrorToast message={pinHeartsLoadError} />}
        </div>
      </SubMapProvider>
    </PinTypesProvider>
  )
}
