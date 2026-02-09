import React from "react"
import type { PinType } from "../types"
import { getPinTypeConfig, PinTypeIcon, PIN_TYPES } from "../utils/pinTypeIcons"

type Props = {
  layout?: "modal" | "panel"
  onSelectType: (type: PinType) => void
  onCancel: () => void
}

export default function PinTypeModal({ layout = "modal", onSelectType, onCancel }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault()
      e.stopPropagation()
      onCancel()
    }
  }

  const content = (
    <div className="bg-base-100 rounded-lg shadow-lg max-w-md w-full border border-base-300 max-h-modal-mobile-90 flex flex-col overflow-hidden">
      <div className="p-6 border-b border-base-300 flex-shrink-0">
        <h2 id="pin-type-modal-title" className="text-xl font-semibold text-base-content">
          What type of food offering is this?
        </h2>
      </div>

      <div className="p-6 space-y-3 overflow-y-auto overscroll-contain flex-1 min-h-0">
        {PIN_TYPES.map((type) => {
          const config = getPinTypeConfig(type)
          return (
            <button
              key={type}
              onClick={() => onSelectType(type)}
              className="w-full text-left p-4 border-2 border-base-300 rounded-lg hover:border-primary hover:bg-base-200 transition-colors text-base-content"
            >
              <div className="flex items-start gap-3">
                <span
                  className="pin-type-badge flex-shrink-0 rounded-full flex items-center justify-center w-10 h-10"
                  data-pin-type={type}
                >
                  <PinTypeIcon pinType={type} size={24} />
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base-content">
                    {config.label}
                  </h3>
                  <p className="text-sm text-base-content/80 mt-1">
                    {config.description}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="p-4 border-t border-base-300 flex justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-base-content hover:bg-base-200 rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )

  if (layout === "panel") return content
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-type-modal-title"
      onKeyDown={handleKeyDown}
    >
      {content}
    </div>
  )
}
