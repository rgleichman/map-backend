import React from "react"
import type { Pin, PinType } from "../types"
import PinTypeIcon from "./PinTypeIcon"
import { resolvePinTypeConfig } from "../utils/pinTypeIcons"
import { usePinTypes } from "../context/PinTypesContext"
import { listFilterPinTypes } from "../utils/customPinTypes"
import PinTypePickerList from "./PinTypePickerList"
import {
  CLEARED_FILTER,
  clearFilterDimension,
  listActiveFilterChips,
  TIME_FILTER_LABEL,
  TIME_FILTER_NOW,
  type FilterState
} from "./map/filters"
import FloatingPanel from "./FloatingPanel"
import HeartIcon from "./HeartIcon"
import TagCombobox from "./TagCombobox"
import { mapShellOverlayTop } from "../utils/siteLayout"
import { deriveMapTags } from "../utils/tagSuggestions"

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
  emptyLabel,
  catalog = [],
}: {
  filter: FilterState
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>
  className?: string
  /** Shown when there are no chips (single line, no ×). */
  emptyLabel?: string
  catalog?: import("../types").CustomPinType[]
}) {
  const chips = listActiveFilterChips(filter, catalog)
  if (chips.length === 0) {
    if (!emptyLabel) return null
    return (
      <p className={["text-sm text-base-content/55 min-w-0 pointer-events-none", className].filter(Boolean).join(" ")}>
        {emptyLabel}
      </p>
    )
  }

  return (
    <div className={["flex flex-wrap gap-1.5 min-w-0 pointer-events-none", className].filter(Boolean).join(" ")}>
      {chips.map(({ dimension, label, pinType: chipPinType }) => {
        const pinCfg = chipPinType != null ? resolvePinTypeConfig(chipPinType, catalog) : null
        return (
          <span
            key={dimension}
            className="flex min-w-0 max-w-full items-center gap-1 min-h-[32px] rounded-full bg-base-200/95 dark:bg-base-300/90 text-base-content text-xs font-medium border border-base-300/90 dark:border-base-content/20 ring-1 ring-primary/20 dark:ring-primary/30 pl-1.5 pr-0.5 py-0.5 pointer-events-auto"
          >
            {pinCfg != null && chipPinType != null && (
              <span
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                aria-hidden
                style={{
                  backgroundColor: pinCfg.color,
                  border: `2px solid ${pinCfg.borderColor}`,
                  color: pinCfg.textColor
                }}
              >
                <PinTypeIcon pinType={chipPinType} size={14} catalog={catalog} />
              </span>
            )}
            {dimension === "hearted" && (
              <span
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-error/15 text-error"
                aria-hidden
              >
                <HeartIcon filled size={14} />
              </span>
            )}
            <span className="min-w-0 flex-1 truncate py-1 pl-0.5">{label}</span>
            <button
              type="button"
              className="shrink-0 flex items-center justify-center min-w-[36px] min-h-[36px] sm:min-w-8 sm:min-h-8 rounded-full text-base-content/70 hover:bg-base-content/10 dark:hover:bg-base-content/15 active:opacity-80 transition-opacity"
              aria-label={`Remove filter: ${label}`}
              onClick={() => setFilter((f) => clearFilterDimension(f, dimension))}
            >
              <span className="text-base leading-none" aria-hidden>
                ×
              </span>
            </button>
          </span>
        )
      })}
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
  position?: "top-left" | "top-right" | "inline"
  /** When true, show the saved-pins filter section (logged-in users). */
  showSavedFilter?: boolean
  pinHeartsLoading?: boolean
  savedFilterEmptyOnMap?: boolean
}

export default function MapFilters({
  pins,
  filter,
  setFilter,
  openRef,
  panelTopOffset = mapShellOverlayTop(),
  position = "top-left",
  showSavedFilter = false,
  pinHeartsLoading = false,
  savedFilterEmptyOnMap = false,
}: Props) {
  const { catalog } = usePinTypes()
  const tags = deriveMapTags(pins)
  const filterPinTypes = listFilterPinTypes(pins)
  const hasActiveFilter =
    filter.tag !== null ||
    filter.time !== null ||
    filter.pinType !== null ||
    filter.query.trim() !== "" ||
    filter.heartedOnly
  const filterChips = listActiveFilterChips(filter, catalog)
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
      panelClassName="sm:min-w-xs"
      renderCustomTrigger={({ open, expanded, panelId }) => (
        <div
          className={[
            "flex flex-col items-end gap-2 min-w-0 w-full sm:max-w-[min(100vw-2rem,22rem)]",
            filterChips.length === 0 && "justify-end",
            position === "top-right" && "sm:ml-auto",
            position === "inline" && "sm:ml-auto w-full",
            "pointer-events-none"
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <button
            type="button"
            onClick={open}
            className="inline-flex shrink-0 items-center gap-1 min-h-10 px-2.5 rounded-xl text-xs font-medium whitespace-nowrap text-base-content bg-base-100/95 dark:bg-base-100/90 backdrop-blur-sm border border-base-300 shadow-lg hover:bg-base-200/90 dark:hover:bg-base-200/85 active:opacity-90 transition-colors pointer-events-auto"
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={`${filtersSummary}. Add or change filters.`}
          >
            <span>Filter by</span>
            <ChevronDownIcon className="opacity-70 shrink-0" />
          </button>
          {filterChips.length > 0 && (
            <ActiveFilterChips
              filter={filter}
              setFilter={setFilter}
              className="w-full justify-end"
              catalog={catalog}
            />
          )}
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
              catalog={catalog}
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

        {showSavedFilter && (
          <section>
            <p className={sectionTitle}>Saved</p>
            <button
              type="button"
              aria-pressed={filter.heartedOnly}
              disabled={pinHeartsLoading}
              onClick={() => setFilter((f) => ({ ...f, heartedOnly: !f.heartedOnly }))}
              className={[
                "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition min-h-[44px] sm:min-h-0",
                filter.heartedOnly
                  ? "bg-primary text-primary-content"
                  : "bg-base-200 text-base-content hover:bg-base-300",
                pinHeartsLoading && "opacity-60 cursor-not-allowed",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <HeartIcon filled={filter.heartedOnly} size={14} />
              Saved pins only
            </button>
            {savedFilterEmptyOnMap && (
              <p className="text-sm text-base-content/60 mt-2">
                No saved pins on this map —{" "}
                <a href="/saved" className="link link-primary">
                  view all
                </a>
              </p>
            )}
          </section>
        )}

        <section>
          <p className={sectionTitle}>Time</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={filter.time === TIME_FILTER_NOW}
              onClick={() => setTime(filter.time === TIME_FILTER_NOW ? null : TIME_FILTER_NOW)}
              className={`px-3 py-2 rounded-xl text-sm transition min-h-[44px] sm:min-h-0 ${filter.time === TIME_FILTER_NOW ? "bg-primary text-primary-content" : "bg-base-200 text-base-content hover:bg-base-300"}`}
            >
              {TIME_FILTER_LABEL}
            </button>
            <button
              type="button"
              aria-pressed={filter.time === null}
              onClick={() => setTime(null)}
              className={`px-3 py-2 rounded-xl text-sm transition min-h-[44px] sm:min-h-0 ${filter.time === null ? "bg-primary text-primary-content" : "bg-base-200 text-base-content hover:bg-base-300"}`}
            >
              All times
            </button>
          </div>
        </section>

        <section>
          <p className={sectionTitle}>Tag</p>
          {tags.length === 0 ? (
            <p className="text-sm text-base-content/55">No tags on the map yet.</p>
          ) : (
            <TagCombobox
              availableTags={tags}
              selectedTag={filter.tag}
              onSelect={(tag) => setTag(filter.tag === tag ? null : tag)}
              placeholder="Search tags…"
            />
          )}
        </section>

        <section>
          <p className={sectionTitle}>Pin type</p>
          <PinTypePickerList
            pinTypes={filterPinTypes}
            catalog={catalog}
            selectedPinType={filter.pinType}
            onTogglePinType={togglePinType}
            compact
          />
        </section>
      </div>
    </FloatingPanel>
  )
}
