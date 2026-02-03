import React, { useCallback, useEffect, useState } from "react"
import type { PinType } from "../types"
import { getPinTypeConfig } from "../utils/pinTypeIcons"

type Props = {
  onSelectType?: (type: PinType) => void
}

const PIN_TYPES: PinType[] = ["one_time", "scheduled", "food_bank"]

export default function PinTypeLegend({ onSelectType }: Props) {
  const [expanded, setExpanded] = useState(false)

  const close = useCallback(() => setExpanded(false), [])

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [expanded, close])

  const safeBottom = "max(1rem, env(safe-area-inset-bottom))"
  const safeLeft = "max(1rem, env(safe-area-inset-left))"

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={[
          "absolute z-10 flex items-center gap-2 bg-base-100 border border-base-300 rounded-full shadow-lg px-4 py-3 text-sm font-medium text-base-content hover:opacity-90 active:opacity-80 transition-opacity sm:hidden",
          expanded && "hidden"
        ].filter(Boolean).join(" ")}
        style={{
          bottom: safeBottom,
          left: safeLeft
        }}
        aria-label="Show pin types legend"
      >
        Pin types
      </button>

      <>
        <button
          type="button"
          onClick={close}
          className={[
            "fixed inset-0 z-[9] bg-black/20 sm:hidden",
            !expanded && "hidden"
          ].filter(Boolean).join(" ")}
          aria-label="Close legend"
        />
        <div
          className={[
            "absolute z-10 bg-base-100 rounded-lg shadow-lg border border-base-300 p-4 max-w-xs w-[calc(100vw-2rem)] sm:w-auto sm:max-w-xs",
            expanded ? "block" : "hidden",
            "sm:block"
          ].filter(Boolean).join(" ")}
          style={{
            bottom: safeBottom,
            left: safeLeft
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="font-semibold text-base-content text-sm">Pin Types</h3>
            <button
              type="button"
              onClick={close}
              className="p-2 -m-2 rounded-md hover:bg-base-200 active:opacity-80 transition-opacity sm:hidden"
              aria-label="Close legend"
            >
              <span className="text-base-content/70 text-lg leading-none">×</span>
            </button>
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
    </>
  )
}
