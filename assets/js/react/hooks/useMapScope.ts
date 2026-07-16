import { useCallback, useEffect, useRef, useState } from "react"
import * as api from "../api/client"
import {
  communityUrlFromPathname,
  mapPathForScope,
  mapPathWithPinQuery,
  parseInitialPinIdFromSearch,
} from "../mapRoute"
import type { UseMapScopeParams, UseMapScopeResult } from "./mapHookTypes"

export type { NavigateToPin, UseMapScopeParams, UseMapScopeResult } from "./mapHookTypes"
export type { SetCommunityScopeOptions } from "../mapRoute"

export function useMapScope({ datasetCommunityUrl }: UseMapScopeParams): UseMapScopeResult {
  const [communityUrl, setCommunityUrl] = useState<string | undefined>(
    () => datasetCommunityUrl ?? communityUrlFromPathname(window.location.pathname),
  )
  const [initialPinId, setInitialPinId] = useState<number | null>(() => parseInitialPinIdFromSearch())
  const communityUrlRef = useRef(communityUrl)
  communityUrlRef.current = communityUrl
  const pinFocusSeqRef = useRef(0)
  const [pinFocusSeq, setPinFocusSeq] = useState(0)
  const resolvingPinIdsRef = useRef<Set<number>>(new Set())

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
  }, [])

  const onSelectWorld = useCallback(() => {
    setCommunityScope(null)
  }, [setCommunityScope])

  const onSelectCommunity = useCallback((url: string) => {
    setCommunityScope(url)
  }, [setCommunityScope])

  const bumpPinFocus = useCallback(() => {
    pinFocusSeqRef.current += 1
    setPinFocusSeq(pinFocusSeqRef.current)
  }, [])

  useEffect(() => {
    const onPopState = () => {
      setCommunityUrl(communityUrlFromPathname(window.location.pathname))
      setInitialPinId(parseInitialPinIdFromSearch())
      // So MapCanvas treats browser back/forward as intentional pin focus, not a
      // stale initialPinId vs detailPinId race.
      bumpPinFocus()
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [bumpPinFocus])

  const navigateToPin = useCallback<UseMapScopeResult["navigateToPin"]>(async (pinId, pins) => {
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
  }, [setCommunityScope, bumpPinFocus])

  return {
    communityUrl,
    setCommunityScope,
    onSelectWorld,
    onSelectCommunity,
    initialPinId,
    setInitialPinId,
    pinFocusSeq,
    navigateToPin,
    resolvingPinIdsRef,
  }
}
