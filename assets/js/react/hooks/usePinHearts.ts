import { useCallback, useEffect, useRef, useState } from "react"
import * as api from "../api/client"

export type ToggleHeartResult = { needsLogin: true } | { needsLogin: false }

export function usePinHearts(userId?: number, csrfToken?: string) {
  const [heartedPinIds, setHeartedPinIds] = useState<ReadonlySet<number>>(new Set())
  const [loading, setLoading] = useState(Boolean(userId))
  const heartedPinIdsRef = useRef(heartedPinIds)
  heartedPinIdsRef.current = heartedPinIds

  useEffect(() => {
    if (!userId) {
      setHeartedPinIds(new Set())
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    api
      .getMyPinHeartIds()
      .then(({ data }) => {
        if (!cancelled) setHeartedPinIds(new Set(data))
      })
      .catch(() => {
        if (!cancelled) setHeartedPinIds(new Set())
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

  return { heartedPinIds, isHearted, toggleHeart, loading }
}
