import { useCallback, useEffect, useRef, useState } from "react"
import type { CatalogPinType, Pin, SubMap } from "../types"
import { DEFAULT_FILTER, type FilterState } from "../components/map/filters"
import { loadMapData } from "../loadMapData"
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

  const updateOrAddPin = useCallback((pin: Pin) => {
    setPins((prevPins) => upsertPinIntoList(prevPins, pin))
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

  const navigateToPinRef = useRef(navigateToPin)
  navigateToPinRef.current = navigateToPin

  useEffect(() => {
    if (loading || focusIntent == null) return
    if (pins.some((p) => p.id === focusIntent.pinId)) {
      resolvingPinIdsRef.current.delete(focusIntent.pinId)
      return
    }

    void navigateToPinRef.current(focusIntent.pinId, pins)
  }, [loading, focusIntent, pins, resolvingPinIdsRef])

  usePinChannelSync({
    onUpsertPin: updateOrAddPin,
    onDeletePinId: (pinId) => setPins((prev) => prev.filter((p) => p.id !== pinId)),
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
  }
}
