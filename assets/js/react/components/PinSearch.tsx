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

const DEBOUNCE_MS = 150

/** Mobile width: compact when idle; grows with input; full width while focused (filter hidden). */
function mobileSearchWidth(focused: boolean, inputValue: string): string {
  const hasText = inputValue.trim().length > 0
  if (focused) {
    return "min(calc(100vw - 2rem), 18rem)"
  }
  if (!hasText) {
    return "7rem"
  }
  const ch = Math.min(inputValue.length + 6, 28)
  return `min(calc(100vw - 5.5rem), max(7rem, ${ch}ch), 18rem)`
}

type Props = {
  pins: Pin[]
  filter: FilterState
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>
  onSelectPin: (pin: Pin) => void
  topOffset: string
  onFocusChange?: (active: boolean) => void
  pinMatches?: PinFilterMatcher
}

export default function PinSearch({
  pins,
  filter,
  setFilter,
  onSelectPin,
  topOffset,
  onFocusChange,
  pinMatches,
}: Props) {
  const isDesktop = useIsDesktop()
  const { catalog } = usePinTypes()
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState(filter.query)
  const {
    highlightIndex,
    resetHighlight,
    focused,
    close,
    handleFocus,
    handleBlur,
    handleListKeyDown,
  } = useComboboxNavigation(inputRef)

  useEffect(() => {
    setInputValue(filter.query)
  }, [filter.query])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilter((f) => (f.query === inputValue ? f : { ...f, query: inputValue }))
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [inputValue, setFilter])

  const suggestions = useMemo(
    () => searchPinSuggestions(pins, inputValue, catalog, { pinMatches }),
    [pins, inputValue, catalog, pinMatches],
  )

  const showList = focused && inputValue.trim() !== "" && suggestions.length > 0
  const isCompact = !focused && inputValue.trim() === ""

  const clearQuery = useCallback(() => {
    setInputValue("")
    setFilter((f) => ({ ...f, query: "" }))
    resetHighlight()
  }, [setFilter, resetHighlight])

  const selectPin = useCallback(
    (pin: Pin) => {
      setInputValue(pin.title)
      setFilter((f) => ({ ...f, query: pin.title }))
      resetHighlight()
      close()
      onFocusChange?.(false)
      onSelectPin(pin)
    },
    [onSelectPin, onFocusChange, setFilter, resetHighlight, close],
  )

  return (
    <div
      className="absolute z-20 pointer-events-none transition-[width] duration-200 ease-out sm:w-[min(100vw-2rem,18rem)]"
      style={{
        top: topOffset,
        left: "max(1rem, env(safe-area-inset-left))",
        ...(isDesktop ? {} : { width: mobileSearchWidth(focused, inputValue) }),
      }}
    >
      <div className="relative pointer-events-auto w-full">
        <label htmlFor={`${listboxId}-input`} className="sr-only">
          Search pins
        </label>
        <input
          ref={inputRef}
          id={`${listboxId}-input`}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={showList ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={comboboxActiveDescendant(listboxId, showList, highlightIndex)}
          placeholder="Search Pins"
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
              suggestionCount: suggestions.length,
              onSelectIndex: (index) => selectPin(suggestions[index]),
              onClear: clearQuery,
              onClose: () => {
                close()
                onFocusChange?.(false)
              },
              inputValue,
            })
          }
          className={[
            "w-full min-h-10 rounded-xl text-sm text-base-content bg-base-100/95 dark:bg-base-100/90 backdrop-blur-sm border border-base-300 shadow-lg placeholder:text-base-content/50 focus:outline-none focus:ring-2 focus:ring-primary/40",
            isCompact ? "px-2.5" : "px-3",
            "py-2",
          ].join(" ")}
        />
        {showList && (
          <ul id={listboxId} role="listbox" className={`${COMBOBOX_LIST_CLASS} max-h-64`}>
            {suggestions.map((pin, index) => {
              const excerpt = pinSearchExcerpt(pin, inputValue.trim(), catalog)
              return (
                <li
                  key={pin.id}
                  id={comboboxOptionId(listboxId, index)}
                  role="option"
                  aria-selected={index === highlightIndex}
                  className={comboboxOptionClassName(index === highlightIndex, "flex items-start gap-2")}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectPin(pin)}
                >
                  <PinSuggestionOption pin={pin} catalog={catalog} excerpt={excerpt} />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
