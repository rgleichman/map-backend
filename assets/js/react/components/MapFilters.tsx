import React from "react"
import type { Pin, PinType } from "../types"
import { getPinTypeConfig, PIN_TYPES } from "../utils/pinTypeIcons"
import {
  CLEARED_FILTER,
  clearFilterDimension,
  listActiveFilterChips,
  TIME_FILTER_LABEL,
  type FilterState
} from "./map/filters"
import FloatingPanel from "./FloatingPanel"

function deriveTags(pins: Pin[]): string[] {
  return [...new Set(pins.flatMap((p) => p.tags ?? []))].sort()
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function ActiveFilterChips({
  filter,
  setFilter,
  className,
  emptyLabel
}: {
  filter: FilterState
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>
  className?: string
  /** Shown when there are no chips (single line, no ×). */
  emptyLabel?: string
}) {
  const chips = listActiveFilterChips(filter)
  if (chips.length === 0) {
    if (!emptyLabel) return null
    return (
      <p className={["text-sm text-base-content/55 min-w-0", className].filter(Boolean).join(" ")}>{emptyLabel}</p>
    )
  }

  return (
    <div className={["flex flex-wrap gap-1.5 min-w-0", className].filter(Boolean).join(" ")}>
      {chips.map(({ dimension, label }) => (
        <span
          key={dimension}
          className="inline-flex items-center gap-0.5 max-w-full min-h-[32px] rounded-full bg-primary/15 text-primary text-xs font-medium border border-primary/30 pl-2.5 pr-0.5"
        >
          <span className="truncate min-w-0 py-1">{label}</span>
          <button
            type="button"
            className="shrink-0 flex items-center justify-center min-w-[36px] min-h-[36px] sm:min-w-8 sm:min-h-8 rounded-full hover:bg-primary/20 active:opacity-80 transition-opacity"
            aria-label={`Remove filter: ${label}`}
            onClick={() => setFilter((f) => clearFilterDimension(f, dimension))}
          >
            <span className="text-base leading-none text-primary/90" aria-hidden>
              ×
            </span>
          </button>
        </span>
      ))}
    </div>
  )
}

type Props = {
  pins: Pin[]
  filter: FilterState
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>
  openRef?: React.RefObject<{ open(): void } | null>
  /** Top offset for trigger and panel (map CSS space). */
  panelTopOffset?: string
  position?: "top-left" | "top-right"
}

export default function MapFilters({
  pins,
  filter,
  setFilter,
  openRef,
  panelTopOffset = "3.25rem",
  position = "top-left"
}: Props) {
  const tags = deriveTags(pins)
  const hasActiveFilter = filter.tag !== null || filter.time !== null || filter.pinType !== null
  const filterChips = listActiveFilterChips(filter)
  const filtersSummary =
    filterChips.length > 0 ? filterChips.map((c) => c.label).join("; ") : "Map filters"

  const setTag = (tag: string | null) => setFilter((f) => ({ ...f, tag }))
  const setTime = (time: FilterState["time"]) => setFilter((f) => ({ ...f, time }))
  const togglePinType = (pinType: PinType) =>
    setFilter((f) => ({ ...f, pinType: f.pinType === pinType ? null : pinType }))

  const sectionTitle = "text-[11px] font-semibold uppercase tracking-wide text-base-content/50 mb-2"

  return (
    <FloatingPanel
      title="Filters"
      closeAriaLabel="Close filters"
      position={position}
      openRef={openRef}
      topOffset={panelTopOffset}
      elevated
      compact={false}
      renderCustomTrigger={({ open }) => (
        <div
          className={[
            "flex flex-wrap items-center gap-2 min-w-0 max-w-[min(100vw-2rem,22rem)] rounded-2xl border border-base-300 bg-base-100/95 dark:bg-base-100/90 shadow-lg backdrop-blur-sm px-2.5 py-2",
            filterChips.length > 0 && "ring-2 ring-primary ring-offset-2 ring-offset-base-100 dark:ring-offset-base-100",
            filterChips.length === 0 && "justify-end"
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {filterChips.length > 0 && (
            <div className="flex-1 min-w-0">
              <ActiveFilterChips filter={filter} setFilter={setFilter} />
            </div>
          )}
          <button
            type="button"
            onClick={open}
            className="btn btn-ghost btn-sm shrink-0 min-h-10 px-2 gap-1 text-base-content border border-base-300/80 rounded-xl hover:bg-base-200/80"
            aria-label={`${filtersSummary}. Add or change filters.`}
          >
            <span className="text-xs font-medium whitespace-nowrap">Filter by</span>
            <ChevronDownIcon className="opacity-70" />
          </button>
        </div>
      )}
      renderPanelHeader={(close) => (
        <div className="flex flex-wrap items-start gap-2 mb-4 pb-3 border-b border-base-300/60">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-base-content/50 mb-2">
              Active filters
            </p>
            <ActiveFilterChips
              filter={filter}
              setFilter={setFilter}
              emptyLabel="None — choose options below"
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {hasActiveFilter && (
              <button
                type="button"
                className="btn btn-xs btn-ghost text-base-content min-h-9 px-2"
                aria-label="Clear all filters"
                onClick={() => setFilter(CLEARED_FILTER)}
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={close}
              className="btn btn-ghost btn-sm btn-square min-h-9 min-w-9 text-base-content/70 hover:bg-base-200"
              aria-label="Close filters"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
        </div>
      )}
    >
      <div className="space-y-5 max-h-[min(70vh,28rem)] overflow-y-auto pr-0.5 -mr-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-base-content/50">Add or change</p>

        <section>
          <h4 className={sectionTitle}>Time</h4>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTime("now")}
              className={`px-3 py-2 rounded-xl text-sm transition min-h-[44px] sm:min-h-0 ${filter.time === "now" ? "bg-primary text-primary-content" : "bg-base-200 text-base-content hover:bg-base-300"}`}
            >
              {TIME_FILTER_LABEL}
            </button>
            <button
              type="button"
              onClick={() => setTime(null)}
              className={`px-3 py-2 rounded-xl text-sm transition min-h-[44px] sm:min-h-0 ${filter.time === null ? "bg-primary text-primary-content" : "bg-base-200 text-base-content hover:bg-base-300"}`}
            >
              All times
            </button>
          </div>
        </section>

        <section>
          <h4 className={sectionTitle}>Tag</h4>
          {tags.length === 0 ? (
            <p className="text-sm text-base-content/55">No tags on the map yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTag(filter.tag === tag ? null : tag)}
                  className={`px-3 py-2 rounded-xl text-sm transition min-h-[44px] sm:min-h-0 ${filter.tag === tag ? "bg-primary text-primary-content" : "bg-base-200 text-base-content hover:bg-base-300"}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <h4 className={sectionTitle}>Pin type</h4>
          <div className="flex flex-wrap gap-2">
            {PIN_TYPES.map((pinType) => {
              const label = getPinTypeConfig(pinType).label
              return (
                <button
                  key={pinType}
                  type="button"
                  onClick={() => togglePinType(pinType)}
                  className={`px-3 py-2 rounded-xl text-sm transition min-h-[44px] sm:min-h-0 ${filter.pinType === pinType ? "bg-primary text-primary-content" : "bg-base-200 text-base-content hover:bg-base-300"}`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </FloatingPanel>
  )
}
