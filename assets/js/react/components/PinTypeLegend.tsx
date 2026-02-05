import React from "react"
import type { PinType } from "../types"
import { getPinTypeConfig, PinTypeIcon, PIN_TYPES } from "../utils/pinTypeIcons"
import FloatingPanel from "./FloatingPanel"

type Props = {
  onSelectType?: (type: PinType) => void
}

export default function PinTypeLegend({ onSelectType }: Props) {
  return (
    <FloatingPanel
      triggerLabel="Pin types"
      triggerAriaLabel="Show pin types legend"
      title="Pin Types"
      closeAriaLabel="Close legend"
      alwaysVisibleOnDesktop
    >
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
