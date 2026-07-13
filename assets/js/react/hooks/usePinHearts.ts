import { useCallback, useEffect, useRef, useState } from "react"
import * as api from "../api/client"

export type ToggleHeartResult = { needsLogin: true } | { needsLogin: false }

export function usePinHearts(userId?: number, csrfToken?: string) {
  const [heartedPinIds, setHeartedPinIds] = useState<ReadonlySet<number>>(new Set())
  const [loading, setLoading] = useState(Boolean(userId))
  const [loadError, setLoadError] = useState<string | null>(null)
  const heartedPinIdsRef = useRef(heartedPinIds)
  heartedPinIdsRef.current = heartedPinIds

  useEffect(() => {
    if (!userId) {
      setHeartedPinIds(new Set())
      setLoading(false)
      setLoadError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)

    api
      .getMyPinHeartIds()
      .then(({ data }) => {
        if (!cancelled) setHeartedPinIds(new Set(data))
      })
      .catch((e) => {
        if (!cancelled) {
          setHeartedPinIds(new Set())
          setLoadError(e instanceof Error ? e.message : "Could not load saved pins.")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  const isHearted = useCallback((pinId: number) => heartedPinIds.has(pinId), [heartedPinIds])

  const toggleHeart = useCallback(
    async (pinId: number): Promise<ToggleHeartResult> => {
      if (!userId) return { needsLogin: true }

      const wasHearted = heartedPinIdsRef.current.has(pinId)

      setHeartedPinIds((prev) => {
        const next = new Set(prev)
        if (wasHearted) next.delete(pinId)
        else next.add(pinId)
        return next
      })

      try {
        if (wasHearted) await api.unheartPin(csrfToken, pinId)
        else await api.heartPin(csrfToken, pinId)
        return { needsLogin: false }
      } catch {
        setHeartedPinIds((prev) => {
          const next = new Set(prev)
          if (wasHearted) next.add(pinId)
          else next.delete(pinId)
          return next
        })
        throw new Error("Could not update saved pin")
      }
    },
    [userId, csrfToken],
  )

  return { heartedPinIds, isHearted, toggleHeart, loading, loadError }
}
