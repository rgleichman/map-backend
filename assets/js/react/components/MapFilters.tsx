import React from "react"
import type { Pin } from "../types"
import { CLEARED_FILTER, type FilterState } from "./map/filters"
import FloatingPanel from "./FloatingPanel"

function deriveTags(pins: Pin[]): string[] {
  return [...new Set(pins.flatMap((p) => p.tags ?? []))].sort()
}

type Props = {
  pins: Pin[]
  filter: FilterState
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>
  openRef?: React.RefObject<{ open(): void } | null>
  /** When true, trigger is rendered by parent (e.g. in a stacked control group). */
  hideTrigger?: boolean
  /** When hideTrigger, panel top offset (e.g. "6.5rem") so panel opens below the stack. */
  panelTopOffset?: string
  /** Panel/trigger position. */
  position?: "top-left" | "top-right"
}

export default function MapFilters({ pins, filter, setFilter, openRef, hideTrigger, panelTopOffset, position = "top-left" }: Props) {
  const tags = deriveTags(pins)
  const hasActiveFilter = filter.tag !== null || filter.time !== null

  const setTag = (tag: string | null) => setFilter((f) => ({ ...f, tag }))
  const setTime = (time: FilterState["time"]) => setFilter((f) => ({ ...f, time }))

  const clearButtonClass = "w-full btn btn-sm btn-ghost text-base-content min-h-[44px] sm:min-h-0"

  return (
    <FloatingPanel
      triggerLabel="Filters"
      triggerAriaLabel="Show filters"
      title="Filters"
      closeAriaLabel="Close filters"
      position={position}
      openRef={openRef}
      renderTrigger={!hideTrigger}
      topOffset={panelTopOffset}
      elevated
    >
      <div className="space-y-4">
        <section>
          <h4 className="font-medium text-base-content text-xs uppercase tracking-wide mb-2">
            Time
          </h4>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTime("now")}
              className={`px-3 py-1.5 rounded-md text-sm transition min-h-[44px] sm:min-h-0 ${filter.time === "now" ? "bg-primary text-primary-content" : "bg-base-200 text-base-content hover:bg-base-300"}`}
            >
              Open now or within 2 hours
            </button>
          </div>
          {filter.time !== null && (
            <button
              type="button"
              onClick={() => setTime(null)}
              className={clearButtonClass}
            >
              All times
            </button>
          )}
        </section>
        <section>
          <h4 className="font-medium text-base-content text-xs uppercase tracking-wide mb-2">
            Tag
          </h4>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTag(tag)}
                className={`px-3 py-1.5 rounded-md text-sm transition min-h-[44px] sm:min-h-0 ${filter.tag === tag ? "bg-primary text-primary-content" : "bg-base-200 text-base-content hover:bg-base-300"}`}
              >
                {tag}
              </button>
            ))}
          </div>
          {filter.tag !== null && (
            <button
              type="button"
              onClick={() => setTag(null)}
              className={clearButtonClass}
            >
              Clear tags
            </button>
          )}
        </section>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => setFilter(CLEARED_FILTER)}
            className={clearButtonClass}
          >
            Clear all
          </button>
        )}
      </div>
    </FloatingPanel>
  )
}
