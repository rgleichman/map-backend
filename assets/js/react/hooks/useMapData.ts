import { useCallback, useEffect, useRef, useState } from "react"
import type { CatalogPinType, Pin, SubMap } from "../types"
import { DEFAULT_FILTER, type FilterState } from "../components/map/filters"
import { bindCatalogRefreshOnOverlayClose, loadMapCatalog, loadMapData } from "../loadMapData"
import {
  applyOwnedMarkerDeletedRefetch,
  refetchPinAfterMarkerDeleted,
  shouldRefetchOnMarkerDeleted,
} from "../utils/markerDeleted"
import { upsertPinIntoList } from "../utils/pinMerge"
import { usePinChannelSync } from "./usePinChannelSync"
import type { UseMapDataParams, UseMapDataResult } from "./mapHookTypes"

export type { UseMapDataParams, UseMapDataResult } from "./mapHookTypes"

export function useMapData({
  communityUrl,
  onScopeChange,
  navigateToPin,
  resolvingPinIdsRef,
  focusIntent,
}: UseMapDataParams): UseMapDataResult {
  const onScopeChangeRef = useRef(onScopeChange)
  onScopeChangeRef.current = onScopeChange
  const [pins, setPins] = useState<Pin[]>([])
  const [subMap, setSubMap] = useState<SubMap | null>(null)
  const [pinTypes, setPinTypes] = useState<CatalogPinType[]>([])
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)
  const [loading, setLoading] = useState(true)
  const [mapInitialized, setMapInitialized] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const pinsRef = useRef(pins)
  pinsRef.current = pins
  const communityUrlRef = useRef(communityUrl)
  communityUrlRef.current = communityUrl

  const updateOrAddPin = useCallback((pin: Pin) => {
    setPins((prevPins) => upsertPinIntoList(prevPins, pin))
  }, [])

  const handleDeletePinId = useCallback((pinId: number) => {
    if (!shouldRefetchOnMarkerDeleted(pinsRef.current, pinId)) {
      setPins((prev) => prev.filter((p) => p.id !== pinId))
      return
    }
    void refetchPinAfterMarkerDeleted(pinId).then((result) => {
      setPins((prev) => applyOwnedMarkerDeletedRefetch(prev, pinId, result))
    })
  }, [])

  useEffect(() => {
    onScopeChangeRef.current?.()
    setFilter(DEFAULT_FILTER)
    setPins([])
    setSubMap(null)
    setPinTypes([])
    setLoading(true)
    setApiError(null)

    let cancelled = false
    loadMapData(communityUrl)
      .then(({ pins: nextPins, subMap: nextSubMap, pinTypes: nextTypes }) => {
        if (cancelled) return
        setPins(nextPins)
        setSubMap(nextSubMap)
        setPinTypes(nextTypes)
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
  }, [communityUrl])

  const refreshCatalog = useCallback(async () => {
    const url = communityUrlRef.current
    const catalog = await loadMapCatalog(url)
    if (communityUrlRef.current !== url) return
    setPinTypes(catalog.pinTypes)
    setSubMap(catalog.subMap)
  }, [])

  useEffect(() => bindCatalogRefreshOnOverlayClose(() => {
    void refreshCatalog().catch(() => {
      // Keep the in-memory catalog; overlay close should not flash an error.
    })
  }), [refreshCatalog])

  const navigateToPinRef = useRef(navigateToPin)
  navigateToPinRef.current = navigateToPin

  useEffect(() => {
    if (loading || focusIntent == null) return
    if (pins.some((p) => p.id === focusIntent.pinId)) {
      resolvingPinIdsRef.current.delete(focusIntent.pinId)
      return
    }

    void navigateToPinRef.current(focusIntent.pinId, pins).then((pin) => {
      if (pin) updateOrAddPin(pin)
    })
  }, [loading, focusIntent, pins, resolvingPinIdsRef, updateOrAddPin])

  usePinChannelSync({
    onUpsertPin: updateOrAddPin,
    onDeletePinId: handleDeletePinId,
    communityUrl,
    canModerate: subMap?.can_moderate === true,
  })

  return {
    pins,
    setPins,
    subMap,
    setSubMap,
    pinTypes,
    filter,
    setFilter,
    loading,
    mapInitialized,
    apiError,
    setApiError,
    updateOrAddPin,
    refreshCatalog,
  }
}
