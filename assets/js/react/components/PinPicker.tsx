import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import type { Pin } from "../types"
import { usePinTypes } from "../context/PinTypesContext"
import { searchPinSuggestions } from "../utils/pinSearchSuggestions"
import { parsePinIdFromMapUrlInput, resolvePinForLink } from "../utils/resolvePinForLink"
import { HighlightedExcerpt } from "./HighlightedExcerpt"
import { pinSearchExcerpt } from "../utils/pinSearchExcerpt"
import PinTypeIcon from "./PinTypeIcon"

const DEBOUNCE_MS = 150

type Props = {
  pins: Pin[]
  excludePinIds?: number[]
  onSelect: (pin: Pin) => void
  onError?: (message: string) => void
  onInputChange?: () => void
  placeholder?: string
}

export default function PinPicker({
  pins,
  excludePinIds = [],
  onSelect,
  onError,
  onInputChange,
  placeholder = "Search or paste a pin link…",
}: Props) {
  const { catalog } = usePinTypes()
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [focused, setFocused] = useState(false)
  const [resolving, setResolving] = useState(false)

  const excluded = useMemo(() => new Set(excludePinIds), [excludePinIds.join(",")])

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(inputValue), DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [inputValue])

  const pastedPinId = useMemo(() => parsePinIdFromMapUrlInput(inputValue), [inputValue])

  const suggestions = useMemo(() => {
    if (pastedPinId != null) return []
    return searchPinSuggestions(pins, debouncedQuery, catalog).filter((p) => !excluded.has(p.id))
  }, [pins, debouncedQuery, catalog, excluded, pastedPinId])

  const showList = focused && debouncedQuery.trim() !== "" && suggestions.length > 0 && !resolving

  const clearInput = useCallback(() => {
    setInputValue("")
    setDebouncedQuery("")
    setHighlightIndex(-1)
  }, [])

  const selectPin = useCallback(
    (pin: Pin) => {
      onSelect(pin)
      clearInput()
      setFocused(false)
      inputRef.current?.blur()
    },
    [onSelect, clearInput]
  )

  const tryAddPinById = useCallback(
    async (pinId: number) => {
      if (excluded.has(pinId)) {
        onError?.("That pin is already linked.")
        return
      }

      setResolving(true)
      try {
        const pin = await resolvePinForLink(pinId, pins)
        if (!pin) {
          onError?.("Couldn't find that pin.")
          return
        }
        selectPin(pin)
      } finally {
        setResolving(false)
      }
    },
    [excluded, onError, pins, selectPin]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const urlPinId = parsePinIdFromMapUrlInput(inputValue)
      if (urlPinId != null) {
        e.preventDefault()
        void tryAddPinById(urlPinId)
        return
      }
    }

    if (!showList || suggestions.length === 0) {
      if (e.key === "Escape" && inputValue !== "") {
        e.preventDefault()
        clearInput()
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
        inputRef.current?.blur()
        break
    }
  }

  return (
    <div className="relative">
      <label htmlFor={`${listboxId}-input`} className="sr-only">
        Search pins to link
      </label>
      <input
        ref={inputRef}
        id={`${listboxId}-input`}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? listboxId : undefined}
        aria-autocomplete="list"
        aria-busy={resolving}
        aria-activedescendant={
          showList && highlightIndex >= 0 ? `${listboxId}-option-${highlightIndex}` : undefined
        }
        placeholder={placeholder}
        autoComplete="off"
        value={inputValue}
        disabled={resolving}
        onChange={(e) => {
          setInputValue(e.target.value)
          setHighlightIndex(-1)
          onInputChange?.()
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          window.setTimeout(() => {
            setFocused(false)
            setHighlightIndex(-1)
          }, 150)
        }}
        onKeyDown={handleKeyDown}
        className="w-full min-h-10 rounded-lg text-sm px-3 py-2 border border-base-300 bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
      />
      {resolving ? (
        <p className="mt-1 text-sm text-base-content/60">Looking up pin…</p>
      ) : null}
      {!resolving && focused && pastedPinId != null ? (
        <p className="mt-1 text-sm text-base-content/60">Press Enter to link pin #{pastedPinId}</p>
      ) : null}
      {!resolving && focused && debouncedQuery.trim() !== "" && pastedPinId == null && suggestions.length === 0 ? (
        <p className="mt-1 text-sm text-base-content/60">No matching pins on this map.</p>
      ) : null}
      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-10 mt-1 max-h-64 overflow-y-auto rounded-xl border border-base-300 bg-base-100 shadow-lg py-1"
        >
          {suggestions.map((pin, index) => {
            const excerpt = pinSearchExcerpt(pin, debouncedQuery.trim(), catalog)
            return (
              <li
                key={pin.id}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={index === highlightIndex}
                className={[
                  "px-3 py-2 cursor-pointer text-sm flex items-start gap-2",
                  index === highlightIndex
                    ? "bg-primary/15 text-base-content"
                    : "text-base-content hover:bg-base-200/80",
                ].join(" ")}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectPin(pin)}
              >
                <PinTypeIcon pinType={pin.pin_type} size={18} catalog={catalog} className="shrink-0 mt-0.5" />
                <span className="min-w-0 flex-1">
                  <span className="font-medium line-clamp-1">{pin.title}</span>
                  {pin.community ? (
                    <span className="mt-0.5 block text-xs text-base-content/70">{pin.community.name}</span>
                  ) : null}
                  {excerpt ? (
                    <span className="mt-0.5 block text-xs text-base-content/70 line-clamp-1">
                      <HighlightedExcerpt excerpt={excerpt} />
                    </span>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
