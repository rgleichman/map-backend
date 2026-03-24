import React from "react"
import type { PinType } from "../types"
import { useIsDesktop } from "../utils/useMediaQuery"
import { getPinTypeConfig, PinTypeIcon, PIN_TYPES } from "../utils/pinTypeIcons"
import FloatingPanel from "./FloatingPanel"

type Props = {
  /** When set, that row is highlighted (same source as map Filters). */
  selectedPinType?: PinType | null
  /** Toggle: same type again clears the filter. */
  onTogglePinType?: (type: PinType) => void
  closeRef?: React.RefObject<{ close(): void } | null>
}

export default function PinTypeLegend({ selectedPinType = null, onTogglePinType, closeRef }: Props) {
  const isDesktop = useIsDesktop()
  return (
    <FloatingPanel
      triggerLabel="Pin types"
      triggerAriaLabel="Show pin types legend"
      title="Pin Types"
      closeAriaLabel="Close legend"
      closeRef={closeRef}
      compact
      defaultExpanded={isDesktop}
    >
      <div className="space-y-1">
        {PIN_TYPES.map((pinType) => {
          const config = getPinTypeConfig(pinType)
          return (
            <button
              key={pinType}
              type="button"
              aria-pressed={selectedPinType === pinType}
              className={[
                "flex w-full items-center gap-2 text-left text-sm cursor-pointer transition-opacity min-h-[44px] py-2 px-1 -mx-1 rounded-md",
                selectedPinType === pinType
                  ? "bg-primary/15 ring-1 ring-primary/40"
                  : "hover:opacity-80 active:opacity-70 hover:bg-base-200/50",
              ].join(" ")}
              onClick={() => onTogglePinType?.(pinType)}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: config.color,
                  border: `2px solid ${config.borderColor}`,
                  color: config.textColor
                }}
              >
                <PinTypeIcon pinType={pinType} size={20} />
              </div>
              <span className="text-base-content">{config.label}</span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-base-content/80 mt-3 italic">
        Different colors show different types of food offerings
      </p>
    </FloatingPanel>
  )
}
