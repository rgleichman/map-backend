import React, { useCallback, useId, useMemo, useRef, useState } from "react"
import { useDebouncedValue } from "../hooks/useDebouncedValue"
import { searchTagSuggestions } from "../utils/tagSuggestions"
import {
  COMBOBOX_INPUT_CLASS,
  COMBOBOX_LIST_CLASS,
  comboboxActiveDescendant,
  comboboxOptionClassName,
  comboboxOptionId,
  useComboboxNavigation,
} from "../hooks/useComboboxNavigation"
import { HighlightedMatch } from "./HighlightedExcerpt"
import Button from "./ui/Button"

type Props = {
  availableTags: string[]
  excludeTags?: Iterable<string>
  omitCommunityTags?: boolean
  /** When true, Enter/Add can create a new tag from free text. */
  allowCreate?: boolean
  /** Currently active filter tag (filter mode). */
  selectedTag?: string | null
  onSelect: (tag: string) => void
  placeholder?: string
  inputId?: string
  className?: string
}

export default function TagCombobox({
  availableTags,
  excludeTags,
  omitCommunityTags = false,
  allowCreate = false,
  selectedTag = null,
  onSelect,
  placeholder = "Search tags…",
  inputId,
  className,
}: Props) {
  const listboxId = useId()
  const resolvedInputId = inputId ?? `${listboxId}-input`
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState("")
  const debouncedQuery = useDebouncedValue(inputValue)
  const {
    highlightIndex,
    resetHighlight,
    focused,
    close,
    handleFocus,
    handleBlur,
    handleListKeyDown,
  } = useComboboxNavigation(inputRef)

  const suggestions = useMemo(
    () =>
      searchTagSuggestions(availableTags, debouncedQuery, {
        exclude: excludeTags,
        omitCommunityTags,
      }),
    [availableTags, debouncedQuery, excludeTags, omitCommunityTags],
  )

  const showList = focused && suggestions.length > 0

  const clearInput = useCallback(() => {
    setInputValue("")
    resetHighlight()
  }, [resetHighlight])

  const selectTag = useCallback(
    (tag: string) => {
      onSelect(tag)
      clearInput()
      if (!allowCreate) {
        close()
      }
    },
    [onSelect, clearInput, allowCreate, close],
  )

  const tryCreate = useCallback(() => {
    const next = inputValue.trim()
    if (!next || !allowCreate) return false
    onSelect(next)
    clearInput()
    return true
  }, [inputValue, allowCreate, onSelect, clearInput])

  return (
    <div className={["relative", className].filter(Boolean).join(" ")}>
      <div className={allowCreate ? "flex gap-2" : undefined}>
        <input
          ref={inputRef}
          id={resolvedInputId}
          name="tag"
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={showList ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={comboboxActiveDescendant(listboxId, showList, highlightIndex)}
          placeholder={placeholder}
          autoComplete="off"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            resetHighlight()
          }}
          onFocus={() => handleFocus()}
          onBlur={() => handleBlur()}
          onKeyDown={(e) =>
            handleListKeyDown(e, {
              showList,
              suggestionCount: suggestions.length,
              selectSoleMatch: !allowCreate,
              onSelectIndex: (index) => selectTag(suggestions[index]),
              onEnterFallback: () => {
                if (allowCreate) return tryCreate()
                if (showList && suggestions.length > 0) {
                  selectTag(suggestions[0])
                  return true
                }
                return false
              },
              onClear: clearInput,
              onClose: close,
              inputValue,
            })
          }
          className={[
            COMBOBOX_INPUT_CLASS,
            allowCreate ? "flex-1 min-w-0" : "w-full",
          ].join(" ")}
        />
        {allowCreate ? (
          <Button type="button" variant="primary" size="sm" className="shrink-0" onClick={() => tryCreate()}>
            Add tag
          </Button>
        ) : null}
      </div>
      {showList && (
        <ul id={listboxId} role="listbox" className={`${COMBOBOX_LIST_CLASS} max-h-52`}>
          {suggestions.map((tag, index) => {
            const isSelected = selectedTag != null && selectedTag.toLowerCase() === tag.toLowerCase()
            return (
              <li
                key={tag}
                id={comboboxOptionId(listboxId, index)}
                role="option"
                aria-selected={index === highlightIndex || isSelected}
                className={comboboxOptionClassName(index === highlightIndex, isSelected && "font-medium")}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectTag(tag)}
              >
                <HighlightedMatch text={tag} query={debouncedQuery} />
                {isSelected ? (
                  <span className="ml-2 text-xs text-base-content/60">active</span>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
