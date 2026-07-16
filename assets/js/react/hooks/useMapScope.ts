import { useCallback, useEffect, useRef, useState } from "react"
import * as api from "../api/client"
import {
  communityUrlFromPathname,
  mapPathForScope,
  mapPathWithPinQuery,
  parsePinIdFromSearch,
} from "../mapRoute"
import type { PinFocusIntent, UseMapScopeParams, UseMapScopeResult } from "./mapHookTypes"

export type { NavigateToPin, PinFocusIntent, UseMapScopeParams, UseMapScopeResult } from "./mapHookTypes"
export type { SetCommunityScopeOptions } from "../mapRoute"

export function useMapScope({ datasetCommunityUrl }: UseMapScopeParams): UseMapScopeResult {
  const [communityUrl, setCommunityUrl] = useState<string | undefined>(
    () => datasetCommunityUrl ?? communityUrlFromPathname(window.location.pathname),
  )
  const focusTokenRef = useRef(0)
  const [focusIntent, setFocusIntent] = useState<PinFocusIntent | null>(() => {
    const pinId = parsePinIdFromSearch()
    if (pinId == null) return null
    focusTokenRef.current = 1
    return { pinId, token: 1 }
  })
  const [historyCloseSeq, setHistoryCloseSeq] = useState(0)
  const communityUrlRef = useRef(communityUrl)
  communityUrlRef.current = communityUrl
  const resolvingPinIdsRef = useRef<Set<number>>(new Set())

  const requestFocus = useCallback((pinId: number) => {
    focusTokenRef.current += 1
    setFocusIntent({ pinId, token: focusTokenRef.current })
  }, [])

  const consumeFocusIntent = useCallback(() => {
    setFocusIntent(null)
  }, [])

  const setCommunityScope = useCallback<UseMapScopeResult["setCommunityScope"]>((url, options) => {
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
    if (options?.pinId == null) {
      setFocusIntent(null)
    }
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
      const pinId = parsePinIdFromSearch()
      if (pinId != null) {
        requestFocus(pinId)
      } else {
        setFocusIntent(null)
        setHistoryCloseSeq((n) => n + 1)
      }
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [requestFocus])

  const navigateToPin = useCallback<UseMapScopeResult["navigateToPin"]>(async (pinId, pins) => {
    const focusPin = () => {
      requestFocus(pinId)
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
      setFocusIntent(null)
    } finally {
      resolvingPinIdsRef.current.delete(pinId)
    }
  }, [setCommunityScope, requestFocus])

  return {
    communityUrl,
    setCommunityScope,
    onSelectWorld,
    onSelectCommunity,
    focusIntent,
    consumeFocusIntent,
    historyCloseSeq,
    navigateToPin,
    resolvingPinIdsRef,
  }
}
