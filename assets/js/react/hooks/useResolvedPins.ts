import { useEffect, useMemo, useState } from "react"
import { getPin } from "../api/client"
import type { Pin } from "../types"

type ResolvedPinSummary = {
  id: number
  title: string
  pin_type: Pin["pin_type"]
  community?: Pin["community"]
}

function toSummary(pin: Pin): ResolvedPinSummary {
  return {
    id: pin.id,
    title: pin.title,
    pin_type: pin.pin_type,
    community: pin.community,
  }
}

/** Resolves pin ids from a loaded cache, fetching missing ids via GET /api/pins/:id. */
export function useResolvedPins(pinIds: number[], loadedPins: Pin[]): Record<number, ResolvedPinSummary> {
  const [resolved, setResolved] = useState<Record<number, ResolvedPinSummary>>({})

  const missingIds = useMemo(() => {
    const cache = new Map(loadedPins.map((p) => [p.id, p]))
    return pinIds.filter((id) => !cache.has(id) && !resolved[id])
  }, [pinIds, loadedPins, resolved])

  useEffect(() => {
    if (missingIds.length === 0) return
    let cancelled = false

    Promise.all(
      missingIds.map(async (id) => {
        try {
          const { data } = await getPin(id)
          return { id, data }
        } catch {
          return null
        }
      })
    ).then((fetched) => {
      if (cancelled) return
      setResolved((prev) => {
        const next = { ...prev }
        for (const item of fetched) {
          if (!item) continue
          next[item.id] = toSummary(item.data)
        }
        return next
      })
    })

    return () => {
      cancelled = true
    }
  }, [missingIds.join(",")])

  return resolved
}
