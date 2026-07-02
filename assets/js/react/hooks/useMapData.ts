import { useCallback, useEffect, useRef, useState } from "react"
import type { BuiltinPinType, CustomPinType, Pin, SubMap } from "../types"
import { BUILTIN_PIN_TYPES } from "../utils/builtinPinType"
import { DEFAULT_FILTER, type FilterState } from "../components/map/filters"
import { loadMapData } from "../loadMapData"
import { parseInitialPinIdFromSearch } from "../mapRoute"
import { usePinChannelSync } from "./usePinChannelSync"
import type { UseMapDataParams, UseMapDataResult } from "./mapHookTypes"

export type { UseMapDataParams, UseMapDataResult } from "./mapHookTypes"

export function useMapData({
  communityUrl,
  setInitialPinId,
  onScopeChange,
  navigateToPin,
  resolvingPinIdsRef,
  initialPinId,
}: UseMapDataParams): UseMapDataResult {
  const onScopeChangeRef = useRef(onScopeChange)
  onScopeChangeRef.current = onScopeChange
  const [pins, setPins] = useState<Pin[]>([])
  const [subMap, setSubMap] = useState<SubMap | null>(null)
  const [customPinTypes, setCustomPinTypes] = useState<CustomPinType[]>([])
  const [enabledBuiltinTypes, setEnabledBuiltinTypes] = useState<BuiltinPinType[]>(BUILTIN_PIN_TYPES)
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)
  const [loading, setLoading] = useState(true)
  const [mapInitialized, setMapInitialized] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const updateOrAddPin = useCallback((pin: Pin) => {
    setPins((prevPins) => {
      const existingIndex = prevPins.findIndex((p) => p.id === pin.id)
      if (existingIndex >= 0) {
        const existing = prevPins[existingIndex]
        const updated = [...prevPins]
        updated[existingIndex] = { ...pin, is_owner: pin.is_owner ?? existing.is_owner ?? false }
        return updated
      }
      return [...prevPins, { ...pin, is_owner: false }]
    })
  }, [])

  useEffect(() => {
    onScopeChangeRef.current?.()
    setFilter(DEFAULT_FILTER)
    setPins([])
    setSubMap(null)
    setCustomPinTypes([])
    setEnabledBuiltinTypes(BUILTIN_PIN_TYPES)
    setLoading(true)
    setApiError(null)
    setInitialPinId(parseInitialPinIdFromSearch())

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
  }, [communityUrl, setInitialPinId])

  const navigateToPinRef = useRef(navigateToPin)
  navigateToPinRef.current = navigateToPin

  useEffect(() => {
    if (loading || initialPinId === null) return
    if (pins.some((p) => p.id === initialPinId)) {
      resolvingPinIdsRef.current.delete(initialPinId)
      return
    }

    void navigateToPinRef.current(initialPinId, pins)
  }, [loading, initialPinId, pins, resolvingPinIdsRef])

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
    customPinTypes,
    enabledBuiltinTypes,
    filter,
    setFilter,
    loading,
    mapInitialized,
    apiError,
    setApiError,
    updateOrAddPin,
  }
}
