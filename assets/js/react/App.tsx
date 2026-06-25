import React, { useCallback, useEffect, useRef, useState, type Dispatch } from "react"
import MapCanvas from "./components/MapCanvas"
import CommunityMapToolbar from "./components/CommunityMapToolbar"
import MapShell from "./components/MapShell"
import PinFlowUI from "./components/PinFlowUI"
import PinTypeLegend from "./components/PinTypeLegend"
import LoginRequiredModal from "./components/LoginRequiredModal"
import WelcomeModal from "./components/WelcomeModal"
import ErrorToast from "./components/ErrorToast"
import { SubMapProvider } from "./context/SubMapContext"
import { PinTypesProvider } from "./context/PinTypesContext"
import { usePinWorkflow } from "./hooks/usePinWorkflow"
import { useIsDesktop } from "./hooks/useMediaQuery"
import { useMapScope } from "./hooks/useMapScope"
import { useMapData } from "./hooks/useMapData"
import type { PinType } from "./types"
import type { PinWorkflowAction } from "./pinWorkflow/types"
import { canChooseWorldVisibility } from "./utils/subMapForm"
import * as api from "./api/client"
import "@stadiamaps/maplibre-search-box/dist/maplibre-search-box.css"

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

  const { modal, placement, timeError, formError, dispatch, onMapClick, onEdit, onDelete, pendingLocation, pendingPinType, editingPinId, onPlacementMapClick } = workflow
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

  const onPopupOpen = useCallback((pinId: number) => {
    legendCloseRef.current?.close()
    setInitialPinId(pinId)
    const path = window.location.pathname || "/map"
    window.history.replaceState(null, "", `${path}?pin=${pinId}`)
  }, [setInitialPinId])

  const onPopupClose = useCallback(() => {
    requestAnimationFrame(() => {
      if (document.querySelector(".maplibregl-popup") === null) {
        setInitialPinId(null)
        const path = window.location.pathname || "/map"
        window.history.replaceState(null, "", path)
      }
    })
  }, [setInitialPinId])

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
                  onMapClick={onMapClick}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  pendingLocation={pendingLocation}
                  pendingPinType={pendingPinType}
                  editingPinId={editingPinId}
                  onPlacementMapClick={placement ? onPlacementMapClick : undefined}
                  onPopupOpen={onPopupOpen}
                  onPopupClose={onPopupClose}
                  filter={filter}
                  setFilter={setFilter}
                  csrfToken={csrfToken}
                  communityUrl={communityUrl}
                  onSelectCommunity={onSelectCommunity}
                  onNavigateToPin={handleNavigateToPin}
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

          <button
            type="button"
            onClick={openWelcome}
            aria-label="Open help"
            title="Help"
            className="fixed right-3 bottom-3 z-30 btn btn-circle btn-sm bg-base-100/90 text-base-content border border-base-300 shadow hover:bg-base-200"
          >
            ?
          </button>

          <PinFlowUI isDesktop={isDesktop} workflow={workflow} />

          {timeError && <ErrorToast message={timeError} prefix="⏰ " />}
          {formError && <ErrorToast message={formError} />}
          {apiError && <ErrorToast message={apiError} />}
        </div>
      </SubMapProvider>
    </PinTypesProvider>
  )
}
