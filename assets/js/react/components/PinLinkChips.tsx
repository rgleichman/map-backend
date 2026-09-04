import React, { useMemo } from "react"
import type { Pin, PinLink } from "../types"
import { usePinTypes } from "../context/PinTypesContext"
import { useResolvedPins } from "../hooks/useResolvedPins"
import { sourceFieldHint } from "../utils/pinLinkDisplay"
import PinTypeBadge from "./PinTypeBadge"
import RemovableChip from "./RemovableChip"

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
          <RemovableChip
            key={`${link.pin_id}-${link.source_field ?? "explicit"}`}
            title={hint ?? undefined}
            removeLabel={onRemove ? `Remove link to ${title}` : undefined}
            onRemove={onRemove ? () => onRemove(link.pin_id) : undefined}
            onClick={onNavigate ? () => onNavigate(link.pin_id) : undefined}
          >
            <PinTypeBadge pinType={pinType} catalog={catalog} />
            <span className="min-w-0 truncate font-medium pl-0.5">{title}</span>
            {cached?.community ? (
              <span className="text-xs text-base-content/70">({cached.community.name})</span>
            ) : null}
            {hint ? <span className="text-xs text-base-content/60">{hint}</span> : null}
          </RemovableChip>
        )
      })}
    </div>
  )
}
