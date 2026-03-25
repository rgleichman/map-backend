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
                "flex w-full items-center gap-2.5 text-left text-sm rounded-xl transition min-h-[44px] py-2 px-2.5",
                selectedPinType === pinType
                  ? "bg-primary text-primary-content"
                  : "bg-base-200 text-base-content hover:bg-base-300 dark:hover:bg-base-300/80"
              ].join(" ")}
              onClick={() => onTogglePinType?.(pinType)}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: config.color,
                  border: `2px solid ${config.borderColor}`,
                  color: config.textColor
                }}
              >
                <PinTypeIcon pinType={pinType} size={20} />
              </div>
              <span className="font-medium">{config.label}</span>
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
