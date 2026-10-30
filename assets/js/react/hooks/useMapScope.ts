import { useCallback, useEffect, useRef, useState } from "react"
import * as api from "../api/client"
import {
  communityUrlFromPathname,
  isMapPathname,
  mapPathForScope,
  mapPathWithPinQuery,
  parsePinIdFromSearch,
  rememberLastMapPath,
} from "../mapRoute"
import { livePatch } from "../utils/liveNav"
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
    const next = url ?? undefined
    const path =
      options?.pinId != null
        ? mapPathWithPinQuery(next, options.pinId)
        : mapPathForScope(next)
    const onMap = isMapPathname(window.location.pathname)
    const current = communityUrlFromPathname(window.location.pathname)
    if (next !== current) {
      // Patch only works while MapLive owns the URL. Don't desync React scope
      // from LiveView when a content overlay is open.
      if (!onMap) return
      livePatch(path, options?.replace)
    } else if (options?.pinId != null && onMap) {
      window.history.replaceState(null, "", path)
    }
    setCommunityUrl(next)
    rememberLastMapPath()
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
    rememberLastMapPath()
    const onPopState = () => {
      setCommunityUrl(communityUrlFromPathname(window.location.pathname))
      rememberLastMapPath()
      const pinId = parsePinIdFromSearch()
      if (pinId != null) {
        requestFocus(pinId)
      } else {
        setFocusIntent(null)
        setHistoryCloseSeq((n) => n + 1)
      }
    }
    const onSetScope = (event: Event) => {
      const detail = (event as CustomEvent<{ community_url?: string | null; pin_id?: number | null }>).detail
      if (!detail) return
      const next = detail.community_url || undefined
      if (next !== communityUrlRef.current) {
        setCommunityUrl(next)
      }
      if (detail.pin_id != null) {
        requestFocus(detail.pin_id)
      }
      rememberLastMapPath()
    }
    window.addEventListener("popstate", onPopState)
    window.addEventListener("map:set-scope", onSetScope)
    return () => {
      window.removeEventListener("popstate", onPopState)
      window.removeEventListener("map:set-scope", onSetScope)
    }
  }, [requestFocus])

  const navigateToPin = useCallback<UseMapScopeResult["navigateToPin"]>(async (pinId, pins) => {
    const onMap = () => isMapPathname(window.location.pathname)
    const focusPin = () => {
      requestFocus(pinId)
      if (onMap()) {
        window.history.replaceState(null, "", mapPathWithPinQuery(communityUrlRef.current, pinId))
        rememberLastMapPath()
      }
    }

    const existing = pins.find((p) => p.id === pinId)
    if (existing) {
      resolvingPinIdsRef.current.delete(pinId)
      if (!onMap()) return existing
      focusPin()
      return existing
    }

    if (resolvingPinIdsRef.current.has(pinId)) return null
    resolvingPinIdsRef.current.add(pinId)

    try {
      const { data } = await api.getPin(pinId)
      if (!onMap()) return null
      if (data.community?.community_url) {
        setCommunityScope(data.community.community_url, { replace: true, pinId })
      } else {
        setCommunityScope(null, { replace: true, pinId })
      }
      focusPin()
      return data
    } catch {
      if (onMap()) {
        window.history.replaceState(null, "", mapPathForScope(communityUrlRef.current))
        rememberLastMapPath()
      }
      setFocusIntent(null)
      return null
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
