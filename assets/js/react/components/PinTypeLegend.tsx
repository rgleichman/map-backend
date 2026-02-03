import React, { useCallback, useEffect, useState } from "react"
import type { PinType } from "../types"
import { getPinTypeConfig } from "../utils/pinTypeIcons"

type Props = {
  onSelectType?: (type: PinType) => void
}

const PIN_TYPES: PinType[] = ["one_time", "scheduled", "food_bank"]

const SM_BREAKPOINT_PX = 640

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= SM_BREAKPOINT_PX : true
  )
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${SM_BREAKPOINT_PX}px)`)
    const handler = () => setIsDesktop(mql.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])
  return isDesktop
}

export default function PinTypeLegend({ onSelectType }: Props) {
  const isDesktop = useIsDesktop()
  const [expanded, setExpanded] = useState(false)

  const showCollapsed = !isDesktop && !expanded
  const showFull = isDesktop || expanded

  const close = useCallback(() => setExpanded(false), [])

  useEffect(() => {
    if (!showFull) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [showFull, close])

  const safeBottom = "max(1rem, env(safe-area-inset-bottom))"
  const safeLeft = "max(1rem, env(safe-area-inset-left))"

  return (
    <>
      {showCollapsed && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="absolute z-10 flex items-center gap-2 bg-base-100 border border-base-300 rounded-full shadow-lg px-4 py-3 text-sm font-medium text-base-content hover:opacity-90 active:opacity-80 transition-opacity sm:hidden"
          style={{
            bottom: safeBottom,
            left: safeLeft
          }}
          aria-label="Show pin types legend"
        >
          Pin types
        </button>
      )}

      {showFull && (
        <>
          {!isDesktop && (
            <button
              type="button"
              onClick={close}
              className="fixed inset-0 z-[9] bg-black/20 sm:hidden"
              aria-label="Close legend"
            />
          )}
          <div
            className="absolute z-10 bg-base-100 rounded-lg shadow-lg border border-base-300 p-4 max-w-xs w-[calc(100vw-2rem)] sm:w-auto sm:max-w-xs"
            style={{
              bottom: safeBottom,
              left: safeLeft
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-semibold text-base-content text-sm">Pin Types</h3>
              {!isDesktop && (
                <button
                  type="button"
                  onClick={close}
                  className="p-2 -m-2 rounded-md hover:bg-base-200 active:opacity-80 transition-opacity"
                  aria-label="Close legend"
                >
                  <span className="text-base-content/70 text-lg leading-none">×</span>
                </button>
              )}
            </div>
            <div className="space-y-1">
              {PIN_TYPES.map((pinType) => {
                const config = getPinTypeConfig(pinType)
                return (
                  <button
                    key={pinType}
                    type="button"
                    className="flex w-full items-center gap-2 text-left text-sm cursor-pointer hover:opacity-80 active:opacity-70 transition-opacity min-h-[44px] py-2 px-1 -mx-1 rounded-md hover:bg-base-200/50"
                    onClick={() => onSelectType?.(pinType)}
                  >
                    <div
                      className="w-8 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                      style={{
                        backgroundColor: config.color,
                        border: `2px solid ${config.borderColor}`
                      }}
                    >
                      {config.icon}
                    </div>
                    <span className="text-base-content">{config.label}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-base-content/80 mt-3 italic">
              Different colors show different types of food offerings
            </p>
          </div>
        </>
      )}
    </>
  )
}
