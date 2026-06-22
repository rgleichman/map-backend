import React, { useCallback, useEffect, useRef, useState } from "react"
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
import type { BuiltinPinType, CustomPinType, Pin, PinType, SubMap } from "./types"
import { BUILTIN_PIN_TYPES } from "./utils/builtinPinType"
import { canChooseWorldVisibility } from "./utils/subMapForm"
import * as api from "./api/client"
import { usePinChannelSync } from "./hooks/usePinChannelSync"
import { loadMapData } from "./loadMapData"
import { DEFAULT_FILTER, type FilterState } from "./components/map/filters"
import { communityUrlFromPathname, mapPathForScope, mapPathWithPinQuery } from "./mapRoute"
import "@stadiamaps/maplibre-search-box/dist/maplibre-search-box.css"

type Props = {
  userId?: number
  userMuted?: boolean
  csrfToken?: string
  styleUrl?: string
  communityUrl?: string
}

const parseInitialPinId = () => {
  const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("pin")
  const n = p ? parseInt(p, 10) : NaN
  return Number.isInteger(n) ? n : null
}

const WELCOME_SEEN_STORAGE_KEY = "mapgarden:welcomeSeenV1"

export default function App({ userId, userMuted = false, csrfToken, styleUrl = "/api/map/style", communityUrl: datasetCommunityUrl }: Props) {
  const isDesktop = useIsDesktop()
  const [communityUrl, setCommunityUrl] = useState<string | undefined>(
    () => datasetCommunityUrl ?? communityUrlFromPathname(window.location.pathname)
  )
  const [initialPinId, setInitialPinId] = useState(parseInitialPinId)
  const [pins, setPins] = useState<Pin[]>([])
  const [subMap, setSubMap] = useState<SubMap | null>(null)
  const [customPinTypes, setCustomPinTypes] = useState<CustomPinType[]>([])
  const [enabledBuiltinTypes, setEnabledBuiltinTypes] = useState<BuiltinPinType[]>(BUILTIN_PIN_TYPES)
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)
  const [loading, setLoading] = useState(true)
  const [mapInitialized, setMapInitialized] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const legendCloseRef = useRef<{ close(): void } | null>(null)
  const resolvingPinIdsRef = useRef<Set<number>>(new Set())
  const communityUrlRef = useRef(communityUrl)
  communityUrlRef.current = communityUrl
  const pinFocusSeqRef = useRef(0)
  const [pinFocusSeq, setPinFocusSeq] = useState(0)

  const updateOrAddPin = useCallback((pin: Pin) => {
    setPins(prevPins => {
      const existingIndex = prevPins.findIndex(p => p.id === pin.id)
      if (existingIndex >= 0) {
        const existing = prevPins[existingIndex]
        const updated = [...prevPins]
        updated[existingIndex] = { ...pin, is_owner: pin.is_owner ?? existing.is_owner ?? false }
        return updated
      }
      return [...prevPins, { ...pin, is_owner: false }]
    })
  }, [])

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

  const setCommunityScope = useCallback((url: string | null, options?: { replace?: boolean; pinId?: number | null }) => {
    const path =
      options?.pinId != null
        ? mapPathWithPinQuery(url, options.pinId)
        : mapPathForScope(url)
    if (options?.replace) {
      window.history.replaceState(null, "", path)
    } else {
      window.history.pushState(null, "", path)
    }
    setCommunityUrl(url ?? undefined)
  }, [])

  const onSelectWorld = useCallback(() => {
    setCommunityScope(null)
  }, [setCommunityScope])

  const onSelectCommunity = useCallback((url: string) => {
    setCommunityScope(url)
  }, [setCommunityScope])

  useEffect(() => {
    const onPopState = () => {
      setCommunityUrl(communityUrlFromPathname(window.location.pathname))
      setInitialPinId(parseInitialPinId())
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  useEffect(() => {
    dispatch({ type: "close_all" })
    setFilter(DEFAULT_FILTER)
    setPins([])
    setSubMap(null)
    setCustomPinTypes([])
    setEnabledBuiltinTypes(BUILTIN_PIN_TYPES)
    setLoading(true)
    setApiError(null)
    setInitialPinId(parseInitialPinId())

    let cancelled = false
    loadMapData(communityUrl)
      .then(({ pins: nextPins, subMap: nextSubMap, customPinTypes: nextTypes, enabledBuiltinTypes: nextBuiltins }) => {
        if (cancelled) return
        setPins(nextPins)
        setSubMap(nextSubMap)
        setCustomPinTypes(nextTypes)
        setEnabledBuiltinTypes(nextBuiltins)
      })
      .catch((err) => {
        if (cancelled) return
        const message = err instanceof Error
          ? err.message
          : communityUrl
            ? "Failed to load this community."
            : "Failed to load pins."
        setApiError(message)
        setPins([])
        setSubMap(null)
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
          setMapInitialized(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [communityUrl, dispatch])

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

  const bumpPinFocus = useCallback(() => {
    pinFocusSeqRef.current += 1
    setPinFocusSeq(pinFocusSeqRef.current)
  }, [])

  const navigateToPin = useCallback(async (pinId: number) => {
    const focusPin = () => {
      bumpPinFocus()
      setInitialPinId(pinId)
      window.history.replaceState(null, "", mapPathWithPinQuery(communityUrlRef.current, pinId))
    }

    if (pins.some((p) => p.id === pinId)) {
      resolvingPinIdsRef.current.delete(pinId)
      focusPin()
      return
    }

    if (resolvingPinIdsRef.current.has(pinId)) return
    resolvingPinIdsRef.current.add(pinId)

    try {
      const { data } = await api.getPin(pinId)
      if (data.community?.community_url) {
        setCommunityScope(data.community.community_url, { replace: true, pinId })
      } else {
        setCommunityScope(null, { replace: true, pinId })
      }
      focusPin()
    } catch {
      window.history.replaceState(null, "", mapPathForScope(communityUrlRef.current))
      setInitialPinId(null)
    } finally {
      resolvingPinIdsRef.current.delete(pinId)
    }
  }, [pins, setCommunityScope, bumpPinFocus])

  const navigateToPinRef = useRef(navigateToPin)
  navigateToPinRef.current = navigateToPin

  useEffect(() => {
    if (loading || initialPinId === null) return
    if (pins.some((p) => p.id === initialPinId)) {
      resolvingPinIdsRef.current.delete(initialPinId)
      return
    }

    void navigateToPinRef.current(initialPinId)
  }, [loading, initialPinId, pins])

  useEffect(() => {
    if (modal === null) setApiError(null)
  }, [modal])

  usePinChannelSync({
    onUpsertPin: updateOrAddPin,
    onDeletePinId: (pinId) => setPins((prev) => prev.filter((p) => p.id !== pinId)),
    communityUrl,
  })

  const onPopupOpen = useCallback((pinId: number) => {
    legendCloseRef.current?.close()
    const path = window.location.pathname || "/map"
    window.history.replaceState(null, "", `${path}?pin=${pinId}`)
  }, [])

  const onPopupClose = useCallback(() => {
    requestAnimationFrame(() => {
      if (document.querySelector(".maplibregl-popup") === null) {
        const path = window.location.pathname || "/map"
        window.history.replaceState(null, "", path)
      }
    })
  }, [])

  const toggleMapPinTypeFilter = useCallback((pinType: PinType) => {
    setFilter((f) => ({ ...f, pinType: f.pinType === pinType ? null : pinType }))
  }, [])

  const refreshSubMap = useCallback(async () => {
    if (!communityUrl) return
    const { data } = await api.getSubMap(communityUrl)
    setSubMap(data)
  }, [communityUrl])

  const onJoinCommunity = useCallback(async () => {
    if (!communityUrl) return
    try {
      await api.joinSubMap(csrfToken, communityUrl)
      await refreshSubMap()
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to join community.")
    }
  }, [communityUrl, csrfToken, refreshSubMap])

  const onLeaveCommunity = useCallback(async () => {
    if (!communityUrl) return
    try {
      await api.leaveSubMap(csrfToken, communityUrl)
      await refreshSubMap()
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to leave community.")
    }
  }, [communityUrl, csrfToken, refreshSubMap])

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
                  onNavigateToPin={navigateToPin}
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