import React from "react"
import type { PinType } from "../types"
import { getPinTypeConfig } from "../utils/pinTypeIcons"

type Props = {
  onSelectType?: (type: PinType) => void
}

const PIN_TYPES: PinType[] = ["one_time", "scheduled", "food_bank"]

export default function PinTypeLegend({ onSelectType }: Props) {
  return (
    <div className="absolute bottom-4 right-4 bg-base-100 rounded-lg shadow-lg p-4 z-10 max-w-xs border border-base-300">
      <h3 className="font-semibold text-base-content mb-3 text-sm">Pin Types</h3>
      <div className="space-y-2">
        {PIN_TYPES.map((pinType) => {
          const config = getPinTypeConfig(pinType)
          return (
            <div
              key={pinType}
              className="flex items-center gap-2 text-sm cursor-pointer hover:opacity-80 transition-opacity"
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
            </div>
          )
        })}
      </div>
      <p className="text-xs text-base-content/80 mt-3 italic">
        Different colors show different types of food offerings
      </p>
    </div>
  )
}
