import React, { useCallback, useEffect, useId, useState } from "react"

const safeBottom = "max(1rem, env(safe-area-inset-bottom))"
const safeLeft = "max(1rem, env(safe-area-inset-left))"
const safeRight = "max(1rem, env(safe-area-inset-right))"
/** Below map search / location button. */
const topLeftTop = "3.5rem"

type Props = {
  triggerLabel?: string
  triggerAriaLabel?: string
  title: string
  closeAriaLabel: string
  /** Optional controls next to the title (e.g. Clear all). */
  headerActions?: React.ReactNode
  /** Replaces the default pill trigger. Wrapper hides while the panel is open. */
  renderCustomTrigger?: (ctx: {
    open: () => void
    expanded: boolean
    panelId: string
  }) => React.ReactNode
  /** Replaces the default panel header (title, headerActions, close). */
  renderPanelHeader?: (close: () => void) => React.ReactNode
  children: React.ReactNode
  /** When true, panel is always visible on sm+ and trigger is hidden on desktop (PinTypeLegend style). */
  alwaysVisibleOnDesktop?: boolean
  /** Position of trigger and panel. Default bottom-left. */
  position?: "bottom-left" | "top-left" | "top-right"
  /** Optional ref to open the panel from outside (e.g. when user clicks a tag in a popup). */
  openRef?: React.RefObject<{ open(): void } | null>
  /** Optional ref so parent can close the panel (e.g. when a pin is clicked). */
  closeRef?: React.RefObject<{ close(): void } | null>
  /** When false, do not render the trigger (caller renders it and uses openRef to open). */
  renderTrigger?: boolean
  /** Override top for position="top-left" (e.g. "6.5rem" to sit below a stacked control group). */
  topOffset?: string
  /** When true, panel and backdrop use higher z-index so they draw over other floating panels. */
  elevated?: boolean
  /** When true, use compact styling (narrower, softer shadow) for map-overlay style. */
  compact?: boolean
  /** When true, panel starts expanded (e.g. on desktop). */
  defaultExpanded?: boolean
}

export default function FloatingPanel({
  triggerLabel = "",
  triggerAriaLabel = "",
  title,
  closeAriaLabel,
  headerActions,
  renderCustomTrigger,
  renderPanelHeader,
  children,
  alwaysVisibleOnDesktop = false,
  position = "bottom-left",
  openRef,
  closeRef,
  renderTrigger = true,
  topOffset,
  elevated = false,
  compact = false,
  defaultExpanded = false
}: Props) {
  const panelId = useId()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const close = useCallback(() => setExpanded(false), [])

  useEffect(() => {
    if (!openRef) return
    openRef.current = { open: () => setExpanded(true) }
    return () => {
      openRef.current = null
    }
  }, [openRef])

  useEffect(() => {
    if (!closeRef) return
    closeRef.current = { close }
    return () => {
      closeRef.current = null
    }
  }, [closeRef, close])

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [expanded, close])

  const showTrigger =
    alwaysVisibleOnDesktop ? expanded === false : true
  const triggerHiddenWhenExpanded = alwaysVisibleOnDesktop
  const isTopLeft = position === "top-left"
  const isTopRight = position === "top-right"
  const isTop = isTopLeft || isTopRight
  const top = topOffset ?? topLeftTop
  const triggerStyle = isTopLeft
    ? { top: top, left: safeLeft }
    : isTopRight
      ? { top: top, right: safeRight }
      : { bottom: safeBottom, left: safeLeft }
  /** Top custom triggers span both horizontal safe insets so inner `w-full` uses real map width. */
  const customTriggerWrapperStyle = isTop
    ? { top, left: safeLeft, right: safeRight }
    : triggerStyle
  const panelStyle = isTopLeft
    ? { top: top, left: safeLeft }
    : isTopRight
      ? { top: top, right: safeRight }
      : { bottom: safeBottom, left: safeLeft }

  return (
    <>
      {renderTrigger && showTrigger && renderCustomTrigger && (
        <div
          className={[
            "absolute z-10",
            alwaysVisibleOnDesktop && "sm:hidden",
            (triggerHiddenWhenExpanded || expanded) && "hidden"
          ]
            .filter(Boolean)
            .join(" ")}
          style={customTriggerWrapperStyle}
        >
          {renderCustomTrigger({ open: () => setExpanded(true), expanded, panelId })}
        </div>
      )}
      {renderTrigger && showTrigger && !renderCustomTrigger && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={[
            "absolute z-10 flex items-center gap-2 bg-base-100 border border-base-300 rounded-full shadow-lg px-4 py-3 text-sm font-medium text-base-content hover:opacity-90 active:opacity-80 transition-opacity",
            alwaysVisibleOnDesktop && "sm:hidden",
            (triggerHiddenWhenExpanded || expanded) && "hidden"
          ].filter(Boolean).join(" ")}
          style={triggerStyle}
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={triggerAriaLabel}
        >
          {triggerLabel}
        </button>
      )}

      <div
        id={panelId}
        className={[
          elevated ? "absolute z-20 rounded-lg border border-base-300 w-[calc(100vw-2rem)] sm:w-auto" : "absolute z-10 rounded-lg border border-base-300 w-[calc(100vw-2rem)] sm:w-auto",
          compact ? "bg-base-100/80 shadow-md p-3 max-w-[240px]" : "bg-base-100 shadow-lg p-4 max-w-xs",
          expanded ? "block" : "hidden",
          alwaysVisibleOnDesktop && "sm:block"
        ].filter(Boolean).join(" ")}
        style={panelStyle}
      >
        {renderPanelHeader ? (
          renderPanelHeader(close)
        ) : (
          <div className={["flex flex-wrap items-center justify-between gap-2", compact ? "mb-2" : "mb-3"].filter(Boolean).join(" ")}>
            <h3 className={["font-semibold text-base-content shrink-0", compact ? "text-xs" : "text-sm"].filter(Boolean).join(" ")}>{title}</h3>
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              {headerActions}
              <button
                type="button"
                onClick={close}
                className={[
                  "p-2 -m-2 rounded-md hover:bg-base-200 active:opacity-80 transition-opacity",
                  alwaysVisibleOnDesktop && "sm:hidden"
                ].filter(Boolean).join(" ")}
                aria-label={closeAriaLabel}
              >
                <span className="text-base-content/70 text-lg leading-none">×</span>
              </button>
            </div>
          </div>
        )}
        {children}
      </div>
    </>
  )
}
