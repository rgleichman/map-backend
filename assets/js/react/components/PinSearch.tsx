import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import type { Pin } from "../types"
import { useIsDesktop } from "../hooks/useMediaQuery"
import {
  COMBOBOX_LIST_CLASS,
  comboboxActiveDescendant,
  comboboxOptionClassName,
  comboboxOptionId,
  useComboboxNavigation,
} from "../hooks/useComboboxNavigation"
import { usePinTypes } from "../context/PinTypesContext"
import { searchPinSuggestions } from "../utils/pinSearchSuggestions"
import type { FilterState, PinFilterMatcher } from "./map/filters"
import { pinSearchExcerpt } from "../utils/pinSearchExcerpt"
import PinSuggestionOption from "./PinSuggestionOption"
import { searchPlaceSuggestions, type PlaceSuggestion } from "../utils/placeSearch"
import { buildMapSearchOptions } from "../utils/mapSearchOptions"
import { mapShellOverlayTop } from "../utils/siteLayout"

const FILTER_DEBOUNCE_MS = 150
const PLACE_DEBOUNCE_MS = 500
const COLLAPSE_LEAVE_MS = 150

const SEARCH_SHELL_CLASS =
  "min-h-10 rounded-xl text-sm text-base-content bg-base-100/95 dark:bg-base-100/90 backdrop-blur-sm border border-base-300 shadow-lg"

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="8.5" cy="8.5" r="5.25" />
      <path d="M12.5 12.5 16.25 16.25" />
    </svg>
  )
}

function expandedWidth(isDesktop: boolean, focused: boolean, inputValue: string): string {
  if (isDesktop) return "min(100vw - 2rem, 18rem)"
  const hasText = inputValue.trim().length > 0
  if (focused) return "min(calc(100vw - 2rem), 18rem)"
  if (!hasText) return "min(calc(100vw - 5.5rem), 18rem)"
  const ch = Math.min(inputValue.length + 6, 28)
  return `min(calc(100vw - 5.5rem), max(10rem, ${ch}ch), 18rem)`
}

type Props = {
  pins: Pin[]
  filter: FilterState
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>
  onSelectPin: (pin: Pin) => void
  onSelectPlace: (place: PlaceSuggestion) => void
  onFocusChange?: (active: boolean) => void
  pinMatches?: PinFilterMatcher
}

export default function PinSearch({
  pins,
  filter,
  setFilter,
  onSelectPin,
  onSelectPlace,
  onFocusChange,
  pinMatches,
}: Props) {
  const isDesktop = useIsDesktop()
  const { catalog } = usePinTypes()
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const leaveTimerRef = useRef<number | null>(null)
  /** Last query we wrote into filter — ignore echo syncs so typing isn't overwritten. */
  const pushedQueryRef = useRef(filter.query)
  const [inputValue, setInputValue] = useState(filter.query)
  const [hovered, setHovered] = useState(false)
  const [places, setPlaces] = useState<PlaceSuggestion[]>([])
  const {
    highlightIndex,
    resetHighlight,
    focused,
    close,
    handleFocus,
    handleBlur,
    handleListKeyDown,
  } = useComboboxNavigation(inputRef)

  const hasQuery = inputValue.trim().length > 0
  const expanded = (isDesktop && hovered) || focused || hasQuery

  // External filter.query changes only (chip clear, CLEARED_FILTER) — not our debounce echo.
  useEffect(() => {
    if (filter.query === pushedQueryRef.current) return
    pushedQueryRef.current = filter.query
    setInputValue(filter.query)
  }, [filter.query])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      pushedQueryRef.current = inputValue
      setFilter((f) => (f.query === inputValue ? f : { ...f, query: inputValue }))
    }, FILTER_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [inputValue, setFilter])

  useEffect(() => {
    const q = inputValue.trim()
    if (q === "") {
      setPlaces([])
      return
    }
    const controller = new AbortController()
    const handle = window.setTimeout(() => {
      void searchPlaceSuggestions(q, { signal: controller.signal })
        .then((results) => {
          if (!controller.signal.aborted) setPlaces(results)
        })
        .catch(() => {
          if (!controller.signal.aborted) setPlaces([])
        })
    }, PLACE_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(handle)
      controller.abort()
    }
  }, [inputValue])

  const pinSuggestions = useMemo(
    () => searchPinSuggestions(pins, inputValue, catalog, { pinMatches }),
    [pins, inputValue, catalog, pinMatches],
  )

  const options = useMemo(
    () => buildMapSearchOptions(pinSuggestions, places),
    [pinSuggestions, places],
  )

  const showList = focused && hasQuery && options.length > 0

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimerRef.current != null) {
      window.clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    clearLeaveTimer()
    setHovered(true)
  }, [clearLeaveTimer])

  const handleMouseLeave = useCallback(() => {
    clearLeaveTimer()
    leaveTimerRef.current = window.setTimeout(() => {
      setHovered(false)
      leaveTimerRef.current = null
    }, COLLAPSE_LEAVE_MS)
  }, [clearLeaveTimer])

  useEffect(() => () => clearLeaveTimer(), [clearLeaveTimer])

  const clearQuery = useCallback(() => {
    pushedQueryRef.current = ""
    setInputValue("")
    setFilter((f) => ({ ...f, query: "" }))
    setPlaces([])
    resetHighlight()
  }, [setFilter, resetHighlight])

  const selectPin = useCallback(
    (pin: Pin) => {
      pushedQueryRef.current = pin.title
      setInputValue(pin.title)
      setFilter((f) => ({ ...f, query: pin.title }))
      resetHighlight()
      close()
      onFocusChange?.(false)
      onSelectPin(pin)
    },
    [onSelectPin, onFocusChange, setFilter, resetHighlight, close],
  )

  const selectPlace = useCallback(
    (place: PlaceSuggestion) => {
      // Place nav is geographic — don't leave a pin text filter from the typed query.
      clearQuery()
      close()
      onFocusChange?.(false)
      onSelectPlace(place)
    },
    [onSelectPlace, onFocusChange, clearQuery, close],
  )

  const selectOptionAt = useCallback(
    (index: number) => {
      const option = options[index]
      if (!option) return
      if (option.kind === "pin") selectPin(option.pin)
      else selectPlace(option.place)
    },
    [options, selectPin, selectPlace],
  )

  const expandAndFocus = useCallback(() => {
    clearLeaveTimer()
    setHovered(true)
    inputRef.current?.focus()
  }, [clearLeaveTimer])

  return (
    <div
      className="absolute z-20 pointer-events-none transition-[width] duration-200 ease-out"
      style={{
        top: mapShellOverlayTop(),
        left: "max(1rem, env(safe-area-inset-left))",
        width: expanded ? expandedWidth(isDesktop, focused, inputValue) : "2.5rem",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative pointer-events-auto w-full">
        {!expanded ? (
          <button
            type="button"
            aria-label="Search"
            className={[
              SEARCH_SHELL_CLASS,
              "flex w-10 items-center justify-center text-base-content/80 hover:text-base-content transition-colors",
            ].join(" ")}
            onClick={expandAndFocus}
          >
            <SearchIcon />
          </button>
        ) : null}
        <label htmlFor={`${listboxId}-input`} className="sr-only">
          Search pins and places
        </label>
        <div className={expanded ? "relative" : "sr-only"}>
          <span className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-base-content/60">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            id={`${listboxId}-input`}
            type="search"
            role="combobox"
            tabIndex={expanded ? 0 : -1}
            aria-expanded={showList}
            aria-controls={showList ? listboxId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={comboboxActiveDescendant(listboxId, showList, highlightIndex)}
            placeholder="Search"
            autoComplete="off"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              resetHighlight()
            }}
            onFocus={() => handleFocus(onFocusChange)}
            onBlur={() => handleBlur(onFocusChange)}
            onKeyDown={(e) =>
              handleListKeyDown(e, {
                showList,
                suggestionCount: options.length,
                onSelectIndex: selectOptionAt,
                onClear: clearQuery,
                onClose: () => {
                  close()
                  onFocusChange?.(false)
                },
                inputValue,
              })
            }
            className={[
              SEARCH_SHELL_CLASS,
              "w-full pl-9 pr-3 py-2 placeholder:text-base-content/50 focus:outline-none focus:ring-2 focus:ring-primary/40",
            ].join(" ")}
          />
        </div>
        {showList && (
          <ul id={listboxId} role="listbox" className={`${COMBOBOX_LIST_CLASS} max-h-72`}>
            {pinSuggestions.length > 0 && (
              <li
                role="presentation"
                className="px-3 pt-2 pb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-base-content/50"
              >
                Pins
              </li>
            )}
            {options.map((option, index) => {
              if (option.kind === "pin") {
                const excerpt = pinSearchExcerpt(option.pin, inputValue.trim(), catalog)
                return (
                  <li
                    key={`pin-${option.pin.id}`}
                    id={comboboxOptionId(listboxId, index)}
                    role="option"
                    aria-selected={index === highlightIndex}
                    className={comboboxOptionClassName(index === highlightIndex, "flex items-start gap-2")}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectPin(option.pin)}
                  >
                    <PinSuggestionOption pin={option.pin} catalog={catalog} excerpt={excerpt} />
                  </li>
                )
              }
              const placeIndex = index - pinSuggestions.length
              return (
                <React.Fragment key={`place-wrap-${option.place.id}`}>
                  {placeIndex === 0 && (
                    <li
                      role="presentation"
                      className="px-3 pt-2 pb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-base-content/50"
                    >
                      Places
                    </li>
                  )}
                  <li
                    id={comboboxOptionId(listboxId, index)}
                    role="option"
                    aria-selected={index === highlightIndex}
                    className={comboboxOptionClassName(index === highlightIndex, "flex flex-col gap-0.5")}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectPlace(option.place)}
                  >
                    <span className="font-medium line-clamp-1">{option.place.name}</span>
                    {option.place.label !== option.place.name ? (
                      <span className="text-xs text-base-content/70 line-clamp-1">{option.place.label}</span>
                    ) : null}
                  </li>
                </React.Fragment>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
