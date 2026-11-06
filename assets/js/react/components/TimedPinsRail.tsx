import React from "react"
import type { Pin } from "../types"
import { usePinTypes } from "../context/PinTypesContext"
import PinTypeBadge from "./PinTypeBadge"
import { GardenCopy } from "../utils/gardenCopy"
import { formatPinScheduleSummary } from "../utils/pinScheduleSummary"
import { PIN_FLOATING_CARD_CLASSES } from "../utils/siteLayout"
import DiscoveryRailHeader from "./DiscoveryRailHeader"

type Props = {
  pins: Pin[]
  onOpenPin: (pinId: number) => void
  /** Newly planted is expanded below, so this list stays at most 40% tall. */
  shareColumn?: boolean
  /** Newly planted is collapsed to a chip below. Grow only into the space above it. */
  aboveCollapsedSibling?: boolean
  minimized?: boolean
  onToggleMinimized: () => void
}

/** Desktop list of timed pins in view; sits in the map top-right stack below chrome controls. */
export default function TimedPinsRail({
  pins,
  onOpenPin,
  shareColumn = false,
  aboveCollapsedSibling = false,
  minimized = false,
  onToggleMinimized,
}: Props) {
  const { catalog } = usePinTypes()
  const titleId = "timed-pins-rail-title"
  const listId = "timed-pins-rail-list"

  return (
    <aside
      className={[
        "flex min-h-0 flex-col overflow-hidden pointer-events-auto",
        minimized
          ? "w-fit max-w-full shrink-0 self-end"
          : shareColumn
            ? "w-full shrink-0 max-h-[40%]"
            : aboveCollapsedSibling
              ? "w-full min-h-0 shrink"
              : "w-full min-h-0 shrink max-h-full",
        PIN_FLOATING_CARD_CLASSES,
      ].join(" ")}
      aria-labelledby={titleId}
    >
      <DiscoveryRailHeader
        titleId={titleId}
        title={GardenCopy.scheduledPlants}
        listId={listId}
        minimized={minimized}
        onToggle={onToggleMinimized}
      />
      {minimized ? null : (
        <ul id={listId} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {pins.map((pin) => {
            const summary = formatPinScheduleSummary(pin)
            return (
              <li key={pin.id}>
                <button
                  type="button"
                  onClick={() => onOpenPin(pin.id)}
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
                    {summary ? (
                      <span className="text-xs leading-snug text-base-content/70 line-clamp-2">
                        {summary}
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
