import React, { useCallback, useEffect, useState } from "react"

const safeBottom = "max(1rem, env(safe-area-inset-bottom))"
const safeLeft = "max(1rem, env(safe-area-inset-left))"
const safeRight = "max(1rem, env(safe-area-inset-right))"
/** Below map search / location button. */
const topLeftTop = "3.5rem"

type Props = {
  triggerLabel: string
  triggerAriaLabel: string
  title: string
  closeAriaLabel: string
  children: React.ReactNode
  /** When true, panel is always visible on sm+ and trigger is hidden on desktop (PinTypeLegend style). */
  alwaysVisibleOnDesktop?: boolean
  /** Position of trigger and panel. Default bottom-left. */
  position?: "bottom-left" | "top-left" | "top-right"
  /** Optional ref to open the panel from outside (e.g. when user clicks a tag in a popup). */
  openRef?: React.RefObject<{ open(): void } | null>
  /** When false, do not render the trigger (caller renders it and uses openRef to open). */
  renderTrigger?: boolean
  /** Override top for position="top-left" (e.g. "6.5rem" to sit below a stacked control group). */
  topOffset?: string
  /** When true, panel and backdrop use higher z-index so they draw over other floating panels. */
  elevated?: boolean
}

export default function FloatingPanel({
  triggerLabel,
  triggerAriaLabel,
  title,
  closeAriaLabel,
  children,
  alwaysVisibleOnDesktop = false,
  position = "bottom-left",
  openRef,
  renderTrigger = true,
  topOffset,
  elevated = false
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const close = useCallback(() => setExpanded(false), [])

  useEffect(() => {
    if (!openRef) return
    openRef.current = { open: () => setExpanded(true) }
    return () => {
      openRef.current = null
    }
  }, [openRef])

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
  const panelStyle = isTopLeft
    ? { top: top, left: safeLeft }
    : isTopRight
      ? { top: top, right: safeRight }
      : { bottom: safeBottom, left: safeLeft }

  return (
    <>
      {renderTrigger && showTrigger && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={[
            "absolute z-10 flex items-center gap-2 bg-base-100 border border-base-300 rounded-full shadow-lg px-4 py-3 text-sm font-medium text-base-content hover:opacity-90 active:opacity-80 transition-opacity",
            alwaysVisibleOnDesktop && "sm:hidden",
            triggerHiddenWhenExpanded && expanded && "hidden"
          ].filter(Boolean).join(" ")}
          style={triggerStyle}
          aria-label={triggerAriaLabel}
        >
          {triggerLabel}
        </button>
      )}

      <div
        className={[
          elevated ? "absolute z-20 bg-base-100 rounded-lg shadow-lg border border-base-300 p-4 max-w-xs w-[calc(100vw-2rem)] sm:w-auto sm:max-w-xs" : "absolute z-10 bg-base-100 rounded-lg shadow-lg border border-base-300 p-4 max-w-xs w-[calc(100vw-2rem)] sm:w-auto sm:max-w-xs",
          expanded ? "block" : "hidden",
          alwaysVisibleOnDesktop && "sm:block"
        ].filter(Boolean).join(" ")}
        style={panelStyle}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="font-semibold text-base-content text-sm">{title}</h3>
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
        {children}
      </div>
    </>
  )
}
