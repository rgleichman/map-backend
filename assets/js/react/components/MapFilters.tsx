import React from "react"
import type { Pin, PinType } from "../types"
import { usePinTypes } from "../context/PinTypesContext"
import PinTypeBadge from "./PinTypeBadge"
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
import CloseButton from "./ui/CloseButton"
import Button from "./ui/Button"
import HeartIcon from "./HeartIcon"
import TagCombobox from "./TagCombobox"
import { mapShellFiltersMaxHeight, mapShellOverlayTop } from "../utils/siteLayout"
import { deriveMapTags } from "../utils/tagSuggestions"
import {
  MAP_OVERLAY_CONTROL_CLASS,
  SECTION_LABEL_CLASS,
  filterChipClass,
} from "../utils/mapUiClasses"
import RemovableChip from "./RemovableChip"

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
        return (
          <RemovableChip
            key={dimension}
            className="pointer-events-auto"
            removeLabel={`Remove filter: ${label}`}
            onRemove={() => setFilter((f) => clearFilterDimension(f, dimension))}
          >
            {chipPinType != null && <PinTypeBadge pinType={chipPinType} catalog={catalog} />}
            {dimension === "hearted" && (
              <span
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-error/15 text-base-content"
                aria-hidden
              >
                <HeartIcon filled size={14} />
              </span>
            )}
            <span className="min-w-0 flex-1 truncate pl-0.5">{label}</span>
          </RemovableChip>
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
  /** When true, show My pins / Saved filters (logged-in users). */
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
    filter.heartedOnly ||
    filter.mineOnly
  const filterChips = listActiveFilterChips(filter, catalog)
  const filtersSummary =
    filterChips.length > 0 ? filterChips.map((c) => c.label).join("; ") : "Map filters"

  const setTag = (tag: string | null) => setFilter((f) => ({ ...f, tag }))
  const setTime = (time: FilterState["time"]) => setFilter((f) => ({ ...f, time }))
  const togglePinType = (pinType: PinType) =>
    setFilter((f) => ({ ...f, pinType: f.pinType === pinType ? null : pinType }))

  const sectionTitle = `${SECTION_LABEL_CLASS} mb-2`

  return (
    <FloatingPanel
      title="Filters"
      closeAriaLabel="Close filters"
      position={position}
      openRef={openRef}
      topOffset={panelTopOffset}
      elevated
      compact={false}
      maxHeight={position === "inline" ? mapShellFiltersMaxHeight() : undefined}
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
            className={`${MAP_OVERLAY_CONTROL_CLASS} pointer-events-auto`}
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
            <p className={`${SECTION_LABEL_CLASS} mb-2`}>
              Active filters
            </p>
            <ActiveFilterChips
              filter={filter}
              setFilter={setFilter}
              emptyLabel="No active filters"
              catalog={catalog}
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {hasActiveFilter && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="text-base-content min-h-9 px-2"
                aria-label="Clear all filters"
                onClick={() => setFilter(CLEARED_FILTER)}
              >
                Clear all
              </Button>
            )}
            <CloseButton square aria-label="Close filters" onClick={close} />
          </div>
        </div>
      )}
    >
      <div className="space-y-5 flex-1 min-h-0 overflow-y-auto pr-0.5 -mr-0.5">
        {showSavedFilter && (
          <section>
            <p className={sectionTitle}>Yours</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={filter.mineOnly}
                onClick={() => setFilter((f) => ({ ...f, mineOnly: !f.mineOnly }))}
                className={filterChipClass(filter.mineOnly)}
              >
                My pins
              </button>
              <button
                type="button"
                aria-pressed={filter.heartedOnly}
                disabled={pinHeartsLoading}
                onClick={() => setFilter((f) => ({ ...f, heartedOnly: !f.heartedOnly }))}
                className={filterChipClass(
                  filter.heartedOnly,
                  pinHeartsLoading && "opacity-60 cursor-not-allowed",
                )}
              >
                <HeartIcon filled={filter.heartedOnly} size={14} />
                Saved pins only
              </button>
            </div>
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
              className={filterChipClass(filter.time === TIME_FILTER_NOW)}
            >
              {TIME_FILTER_LABEL}
            </button>
            <button
              type="button"
              aria-pressed={filter.time === null}
              onClick={() => setTime(null)}
              className={filterChipClass(filter.time === null)}
            >
              All times
            </button>
          </div>
        </section>

        <section>
          <p className={sectionTitle}>Tags</p>
          {tags.length === 0 ? (
            <p className="text-sm text-base-content/60">No tags on the map yet.</p>
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
