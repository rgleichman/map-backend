import React, { useCallback, useId, useMemo, useRef, useState } from "react"
import type { Pin } from "../types"
import { usePinTypes } from "../context/PinTypesContext"
import { useDebouncedValue } from "../hooks/useDebouncedValue"
import {
  COMBOBOX_LIST_CLASS,
  comboboxActiveDescendant,
  comboboxOptionClassName,
  comboboxOptionId,
  useComboboxNavigation,
} from "../hooks/useComboboxNavigation"
import { searchPinSuggestions } from "../utils/pinSearchSuggestions"
import { parsePinIdFromMapUrlInput, resolvePinForLink } from "../utils/resolvePinForLink"
import { pinSearchExcerpt } from "../utils/pinSearchExcerpt"
import PinSuggestionOption from "./PinSuggestionOption"

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
  const debouncedQuery = useDebouncedValue(inputValue)
  const [resolving, setResolving] = useState(false)
  const {
    highlightIndex,
    resetHighlight,
    focused,
    close,
    handleFocus,
    handleBlur,
    handleListKeyDown,
  } = useComboboxNavigation(inputRef)

  const excluded = useMemo(() => new Set(excludePinIds), [excludePinIds.join(",")])

  const pastedPinId = useMemo(() => parsePinIdFromMapUrlInput(inputValue), [inputValue])

  const suggestions = useMemo(() => {
    if (pastedPinId != null) return []
    return searchPinSuggestions(pins, debouncedQuery, catalog).filter((p) => !excluded.has(p.id))
  }, [pins, debouncedQuery, catalog, excluded, pastedPinId])

  const showList = focused && debouncedQuery.trim() !== "" && suggestions.length > 0 && !resolving

  const clearInput = useCallback(() => {
    setInputValue("")
    resetHighlight()
  }, [resetHighlight])

  const selectPin = useCallback(
    (pin: Pin) => {
      onSelect(pin)
      clearInput()
      close()
    },
    [onSelect, clearInput, close],
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
    [excluded, onError, pins, selectPin],
  )

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
        aria-activedescendant={comboboxActiveDescendant(listboxId, showList, highlightIndex)}
        placeholder={placeholder}
        autoComplete="off"
        value={inputValue}
        disabled={resolving}
        onChange={(e) => {
          setInputValue(e.target.value)
          resetHighlight()
          onInputChange?.()
        }}
        onFocus={() => handleFocus()}
        onBlur={() => handleBlur()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const urlPinId = parsePinIdFromMapUrlInput(inputValue)
            if (urlPinId != null) {
              e.preventDefault()
              void tryAddPinById(urlPinId)
              return
            }
          }
          handleListKeyDown(e, {
            showList,
            suggestionCount: suggestions.length,
            onSelectIndex: (index) => selectPin(suggestions[index]),
            onClear: clearInput,
            onClose: close,
            inputValue,
          })
        }}
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
        <ul id={listboxId} role="listbox" className={`${COMBOBOX_LIST_CLASS} max-h-64`}>
          {suggestions.map((pin, index) => {
            const excerpt = pinSearchExcerpt(pin, debouncedQuery.trim(), catalog)
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
                <PinSuggestionOption pin={pin} catalog={catalog} excerpt={excerpt} showCommunity />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
