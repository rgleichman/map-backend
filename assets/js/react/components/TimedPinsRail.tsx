import React from "react"
import type { Pin } from "../types"
import { usePinTypes } from "../context/PinTypesContext"
import PinTypeBadge from "./PinTypeBadge"
import { GardenCopy } from "../utils/gardenCopy"
import { formatPinScheduleSummary } from "../utils/pinScheduleSummary"
import { PIN_FLOATING_CARD_CLASSES } from "../utils/siteLayout"

type Props = {
  pins: Pin[]
  onOpenPin: (pinId: number) => void
}

/** Desktop list of timed pins in view; sits in the map top-right stack below chrome controls. */
export default function TimedPinsRail({ pins, onOpenPin }: Props) {
  const { catalog } = usePinTypes()
  const titleId = "timed-pins-rail-title"

  return (
    <aside
      className={[
        "flex shrink-0 flex-col overflow-hidden w-full max-w-md max-h-full pointer-events-auto",
        PIN_FLOATING_CARD_CLASSES,
      ].join(" ")}
      aria-labelledby={titleId}
    >
      <header className="shrink-0 border-b border-base-300 px-4 py-3">
        <h2 id={titleId} className="text-sm font-semibold text-base-content">
          {GardenCopy.scheduledPlants}
        </h2>
      </header>
      <ul className="min-h-0 overflow-y-auto overscroll-contain p-2">
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
    </aside>
  )
}
