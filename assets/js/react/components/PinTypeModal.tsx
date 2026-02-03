import React from "react"
import type { PinType } from "../types"

type Props = {
  onSelectType: (type: PinType) => void
  onCancel: () => void
}

const PIN_TYPES = [
  {
    type: "one_time" as const,
    title: "One-Time Food Offering",
    description: "A single food offering event at a specific time",
    icon: "🍕"
  },
  {
    type: "scheduled" as const,
    title: "Scheduled Food Offering",
    description: "Recurring food offerings on a regular schedule",
    icon: "📅"
  },
  {
    type: "food_bank" as const,
    title: "Food Bank / Pantry",
    description: "A food bank or pantry with regular open hours",
    icon: "🏪"
  }
]

export default function PinTypeModal({ onSelectType, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg max-w-md w-full">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            What type of food offering is this?
          </h2>
        </div>
        
        <div className="p-6 space-y-3">
          {PIN_TYPES.map((pinType) => (
            <button
              key={pinType.type}
              onClick={() => onSelectType(pinType.type)}
              className="w-full text-left p-4 border-2 border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{pinType.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {pinType.title}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    {pinType.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
