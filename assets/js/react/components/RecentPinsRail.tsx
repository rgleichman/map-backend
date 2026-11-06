import React from "react"
import type { Pin } from "../types"
import { usePinTypes } from "../context/PinTypesContext"
import PinTypeBadge from "./PinTypeBadge"
import { GardenCopy } from "../utils/gardenCopy"
import { isPinNewSince } from "../utils/mapLastVisit"
import { formatRelativeTime } from "../utils/relativeTime"
import { PIN_FLOATING_CARD_CLASSES } from "../utils/siteLayout"
import DiscoveryRailHeader from "./DiscoveryRailHeader"

type Props = {
  pins: Pin[]
  onOpenPin: (pinId: number) => void
  lastVisitWatermark?: Date | null
  minimized?: boolean
  onToggleMinimized: () => void
}

/** Desktop list of the newest plants on this map. Fills the idle right column. */
export default function RecentPinsRail({
  pins,
  onOpenPin,
  lastVisitWatermark = null,
  minimized = false,
  onToggleMinimized,
}: Props) {
  const { catalog } = usePinTypes()
  const titleId = "recent-pins-rail-title"
  const listId = "recent-pins-rail-list"

  return (
    <aside
      className={[
        "flex min-h-0 flex-col overflow-hidden pointer-events-auto",
        minimized ? "w-fit max-w-full shrink-0 self-end" : "w-full flex-1",
        PIN_FLOATING_CARD_CLASSES,
      ].join(" ")}
      aria-labelledby={titleId}
    >
      <DiscoveryRailHeader
        titleId={titleId}
        title={GardenCopy.newlyPlanted}
        listId={listId}
        minimized={minimized}
        onToggle={onToggleMinimized}
      />
      {minimized ? null : (
        <ul id={listId} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {pins.map((pin) => {
            const when = formatRelativeTime(pin.inserted_at)
            const isNew = isPinNewSince(pin, lastVisitWatermark)
            const label = [pin.title, when, isNew ? GardenCopy.newSinceVisit : ""]
              .filter(Boolean)
              .join(", ")
            return (
              <li key={pin.id}>
                <button
                  type="button"
                  onClick={() => onOpenPin(pin.id)}
                  aria-label={label}
                  className={[
                    "flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm",
                    "text-base-content transition",
                    "hover:bg-base-200/90 dark:hover:bg-base-200/85",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    "active:scale-[0.99] origin-center",
                  ].join(" ")}
                >
                  <PinTypeBadge
                    pinType={pin.pin_type}
                    catalog={catalog}
                    size="md"
                    className="mt-0.5 shrink-0"
                  />
                  <span className="min-w-0 flex-1 flex flex-col gap-0.5">
                    <span className="font-medium truncate">{pin.title}</span>
                    {when || isNew ? (
                      <span className="flex items-center gap-1.5 text-xs leading-snug text-base-content/70">
                        {isNew ? (
                          <span className="shrink-0 font-semibold uppercase tracking-wide text-primary">
                            {GardenCopy.newSinceVisit}
                          </span>
                        ) : null}
                        {when ? <span className="truncate">{when}</span> : null}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
