import { useCallback, useState, type KeyboardEvent, type RefObject } from "react"

export const COMBOBOX_BLUR_DELAY_MS = 150

export const COMBOBOX_LIST_CLASS =
  "absolute left-0 right-0 z-10 mt-1 overflow-y-auto rounded-xl border border-base-300 bg-base-100 shadow-lg py-1"

export const COMBOBOX_INPUT_CLASS =
  "min-h-10 rounded-lg text-sm px-3 py-2 border border-base-300 bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/40"

export function comboboxOptionClassName(
  highlighted: boolean,
  ...extra: Array<string | false | null | undefined>
): string {
  return [
    "px-3 py-2 cursor-pointer text-sm",
    highlighted
      ? "bg-primary/15 text-base-content"
      : "text-base-content hover:bg-base-200/80",
    ...extra,
  ]
    .filter(Boolean)
    .join(" ")
}

export function comboboxOptionId(listboxId: string, index: number): string {
  return `${listboxId}-option-${index}`
}

export function comboboxActiveDescendant(
  listboxId: string,
  showList: boolean,
  highlightIndex: number,
): string | undefined {
  if (!showList || highlightIndex < 0) return undefined
  return comboboxOptionId(listboxId, highlightIndex)
}

type ListKeyDownOptions = {
  showList: boolean
  suggestionCount: number
  /** Select the item at `index` (highlighted or sole match). */
  onSelectIndex: (index: number) => void
  /**
   * When true (default), Enter picks the only suggestion if nothing is highlighted.
   * Set false when free-text create should win (e.g. tag Add).
   */
  selectSoleMatch?: boolean
  /**
   * Called on Enter when no list item is selected via highlight/single-match rule.
   * Return true if the key was handled.
   */
  onEnterFallback?: () => boolean | void
  /** Clear input / related state when Escape is pressed with empty list or no list. */
  onClear?: () => void
  /** Close list (blur) after Escape while list is open. */
  onClose?: () => void
  inputValue?: string
}

/**
 * Shared highlight + keyboard + focus/blur behavior for combobox listboxes
 * (MapSearch, PinPicker, TagCombobox).
 */
export function useComboboxNavigation(inputRef?: RefObject<HTMLInputElement | null>) {
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [focused, setFocused] = useState(false)

  const resetHighlight = useCallback(() => setHighlightIndex(-1), [])

  const close = useCallback(() => {
    setFocused(false)
    setHighlightIndex(-1)
    inputRef?.current?.blur()
  }, [inputRef])

  const handleFocus = useCallback((onFocusChange?: (active: boolean) => void) => {
    setFocused(true)
    onFocusChange?.(true)
  }, [])

  const handleBlur = useCallback(
    (onFocusChange?: (active: boolean) => void) => {
      window.setTimeout(() => {
        setFocused(false)
        setHighlightIndex(-1)
        onFocusChange?.(false)
      }, COMBOBOX_BLUR_DELAY_MS)
    },
    [],
  )

  const handleListKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, options: ListKeyDownOptions) => {
      const {
        showList,
        suggestionCount,
        onSelectIndex,
        onEnterFallback,
        onClear,
        onClose,
        inputValue = "",
      } = options

      if (e.key === "Enter") {
        const selectSoleMatch = options.selectSoleMatch !== false
        if (showList && suggestionCount > 0) {
          if (highlightIndex >= 0 && highlightIndex < suggestionCount) {
            e.preventDefault()
            onSelectIndex(highlightIndex)
            return
          }
          if (suggestionCount === 1 && selectSoleMatch) {
            e.preventDefault()
            onSelectIndex(0)
            return
          }
        }
        if (onEnterFallback?.()) {
          e.preventDefault()
        }
        return
      }

      if (!showList || suggestionCount === 0) {
        if (e.key === "Escape" && inputValue !== "") {
          e.preventDefault()
          onClear?.()
        }
        return
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setHighlightIndex((i) => (i + 1) % suggestionCount)
          break
        case "ArrowUp":
          e.preventDefault()
          setHighlightIndex((i) => (i <= 0 ? suggestionCount - 1 : i - 1))
          break
        case "Escape":
          e.preventDefault()
          setHighlightIndex(-1)
          onClose?.()
          break
      }
    },
    [highlightIndex],
  )

  return {
    highlightIndex,
    setHighlightIndex,
    resetHighlight,
    focused,
    setFocused,
    close,
    handleFocus,
    handleBlur,
    handleListKeyDown,
  }
}
