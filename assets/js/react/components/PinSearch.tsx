import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import type { Pin } from "../types"
import { pinMatchesQuery, type FilterState } from "./map/filters"

const DEBOUNCE_MS = 150
const MAX_SUGGESTIONS = 8

function rankPin(pin: Pin, query: string): number {
  const q = query.trim().toLowerCase()
  const title = pin.title.toLowerCase()
  if (title.startsWith(q)) return 0
  if (title.includes(q)) return 1
  if (pin.tags?.some((t) => t.toLowerCase().includes(q))) return 2
  if (pin.description?.toLowerCase().includes(q)) return 3
  return 4
}

function searchSuggestions(pins: Pin[], query: string): Pin[] {
  const q = query.trim()
  if (q === "") return []
  return pins
    .filter((p) => pinMatchesQuery(p, q))
    .sort((a, b) => {
      const ra = rankPin(a, q)
      const rb = rankPin(b, q)
      if (ra !== rb) return ra - rb
      return a.title.localeCompare(b.title)
    })
    .slice(0, MAX_SUGGESTIONS)
}

type Props = {
  pins: Pin[]
  filter: FilterState
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>
  onSelectPin: (pin: Pin) => void
  topOffset: string
  onFocusChange?: (active: boolean) => void
}

export default function PinSearch({
  pins,
  filter,
  setFilter,
  onSelectPin,
  topOffset,
  onFocusChange,
}: Props) {
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState(filter.query)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [focused, setFocused] = useState(false)

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
    () => searchSuggestions(pins, inputValue),
    [pins, inputValue]
  )

  const showList = focused && inputValue.trim() !== "" && suggestions.length > 0

  const selectPin = useCallback(
    (pin: Pin) => {
      setInputValue(pin.title)
      setFilter((f) => ({ ...f, query: pin.title }))
      setHighlightIndex(-1)
      setFocused(false)
      onFocusChange?.(false)
      inputRef.current?.blur()
      onSelectPin(pin)
    },
    [onSelectPin, onFocusChange, setFilter]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showList) {
      if (e.key === "Escape" && inputValue !== "") {
        e.preventDefault()
        setInputValue("")
        setFilter((f) => ({ ...f, query: "" }))
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightIndex((i) => (i + 1) % suggestions.length)
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
        break
      case "Enter":
        e.preventDefault()
        if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
          selectPin(suggestions[highlightIndex])
        } else if (suggestions.length === 1) {
          selectPin(suggestions[0])
        }
        break
      case "Escape":
        e.preventDefault()
        setHighlightIndex(-1)
        setFocused(false)
        onFocusChange?.(false)
        inputRef.current?.blur()
        break
    }
  }

  return (
    <div
      className="absolute z-20 w-[min(100vw-2rem,18rem)] pointer-events-none"
      style={{
        top: topOffset,
        left: "max(1rem, env(safe-area-inset-left))",
      }}
    >
      <div className="relative pointer-events-auto">
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
          aria-activedescendant={
            showList && highlightIndex >= 0
              ? `${listboxId}-option-${highlightIndex}`
              : undefined
          }
          placeholder="Search pins"
          autoComplete="off"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setHighlightIndex(-1)
          }}
          onFocus={() => {
            setFocused(true)
            onFocusChange?.(true)
          }}
          onBlur={() => {
            window.setTimeout(() => {
              setFocused(false)
              onFocusChange?.(false)
              setHighlightIndex(-1)
            }, 150)
          }}
          onKeyDown={handleKeyDown}
          className="w-full min-h-10 px-3 py-2 rounded-xl text-sm text-base-content bg-base-100/95 dark:bg-base-100/90 backdrop-blur-sm border border-base-300 shadow-lg placeholder:text-base-content/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {showList && (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-xl border border-base-300 bg-base-100 shadow-lg py-1"
          >
            {suggestions.map((pin, index) => (
              <li
                key={pin.id}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={index === highlightIndex}
                className={[
                  "px-3 py-2 cursor-pointer text-sm",
                  index === highlightIndex
                    ? "bg-primary/15 text-base-content"
                    : "text-base-content hover:bg-base-200/80",
                ].join(" ")}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectPin(pin)}
              >
                <span className="font-medium line-clamp-1">{pin.title}</span>
                {pin.tags && pin.tags.length > 0 && (
                  <span className="mt-0.5 block text-xs text-base-content/60 line-clamp-1">
                    {pin.tags.slice(0, 3).join(" · ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
