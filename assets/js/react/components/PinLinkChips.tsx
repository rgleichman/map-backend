import React, { useMemo } from "react"
import type { Pin, PinLink } from "../types"
import { usePinTypes } from "../context/PinTypesContext"
import { useResolvedPins } from "../hooks/useResolvedPins"
import { sourceFieldHint } from "../utils/pinLinkDisplay"
import PinTypeBadge from "./PinTypeBadge"

type Props = {
  links: PinLink[]
  pins: Pin[]
  onNavigate?: (pinId: number) => void
  onRemove?: (pinId: number) => void
  /** Show "via description" etc. for text-derived links. Default true. */
  showSourceHint?: boolean
}

export default function PinLinkChips({ links, pins, onNavigate, onRemove, showSourceHint = true }: Props) {
  const { catalog } = usePinTypes()
  const linkIds = useMemo(() => links.map((l) => l.pin_id), [links])
  const resolved = useResolvedPins(linkIds, pins)
  const pinCache = useMemo(() => new Map(pins.map((p) => [p.id, p])), [pins])

  if (links.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => {
        const cached = pinCache.get(link.pin_id) ?? resolved[link.pin_id]
        const title = cached?.title ?? `Pin #${link.pin_id}`
        const pinType = cached?.pin_type ?? "other"
        const hint = showSourceHint ? sourceFieldHint(link.source_field) : null

        return (
          <span
            key={`${link.pin_id}-${link.source_field ?? "explicit"}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-base-200 px-2 py-1 text-sm text-base-content"
            title={hint ?? undefined}
          >
            <PinTypeBadge pinType={pinType} catalog={catalog} />
            <button
              type="button"
              className="font-medium hover:underline border-none bg-transparent cursor-pointer p-0 text-inherit"
              onClick={() => onNavigate?.(link.pin_id)}
            >
              {title}
            </button>
            {cached?.community ? (
              <span className="text-xs text-base-content/70">({cached.community.name})</span>
            ) : null}
            {hint ? <span className="text-xs text-base-content/60">{hint}</span> : null}
            {onRemove ? (
              <button
                type="button"
                className="ml-1 text-error hover:opacity-80 border-none bg-transparent cursor-pointer"
                aria-label={`Remove link to ${title}`}
                onClick={() => onRemove(link.pin_id)}
              >
                ×
              </button>
            ) : null}
          </span>
        )
      })}
    </div>
  )
}
