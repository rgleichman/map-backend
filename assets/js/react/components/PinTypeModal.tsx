import React from "react"
import type { PinType } from "../types"
import { usePinTypes } from "../context/PinTypesContext"
import { builtinIconKeyForPinType } from "../utils/builtinPinType"
import PinTypeIcon from "./PinTypeIcon"
import { getPinTypeConfig, resolvePinTypeConfig } from "../utils/pinTypeIcons"

type Props = {
  layout?: "modal" | "panel"
  onSelectType: (type: PinType) => void
  onCancel: () => void
}

export default function PinTypeModal({ layout = "modal", onSelectType, onCancel }: Props) {
  const { catalog, selectableTypes } = usePinTypes()

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault()
      e.stopPropagation()
      onCancel()
    }
  }

  const shellClassName =
    layout === "panel"
      ? "w-full flex flex-col"
      : "bg-base-100 rounded-lg shadow-lg max-w-md w-full border border-base-300 max-h-modal-mobile-90 flex flex-col overflow-hidden"

  const listClassName =
    layout === "panel"
      ? "space-y-3"
      : "p-6 space-y-3 overflow-y-auto overscroll-contain flex-1 min-h-0"

  const content = (
    <div className={shellClassName}>
      <div className={layout === "panel" ? "pb-4 border-b border-base-300" : "p-6 border-b border-base-300 flex-shrink-0"}>
        <h2 id="pin-type-modal-title" className="text-lg font-semibold text-base-content">
          What type of pin is this?
        </h2>
      </div>

      <div className={listClassName}>
        {selectableTypes.length === 0 ? (
          <p className="text-sm text-base-content/70">
            No pin types are enabled for this map. Community moderators can enable types in settings.
          </p>
        ) : null}
        {selectableTypes.map((type) => {
          const config = resolvePinTypeConfig(type, catalog)
          const builtinConfig = getPinTypeConfig(builtinIconKeyForPinType(type))
          return (
            <button
              key={type}
              onClick={() => onSelectType(type)}
              className="w-full text-left p-4 border-2 border-base-300 rounded-lg hover:border-primary hover:bg-base-200 transition-colors text-base-content"
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex-shrink-0 rounded-full flex items-center justify-center w-10 h-10"
                  style={{
                    backgroundColor: config.backgroundColor,
                    border: `2px solid ${config.borderColor}`,
                    color: config.textColor
                  }}
                >
                  <PinTypeIcon pinType={type} size={24} catalog={catalog} />
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base-content">
                    {config.label}
                  </h3>
                  <p className="text-sm text-base-content/80 mt-1">
                    {config.description || builtinConfig.description}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className={layout === "panel" ? "pt-4 border-t border-base-300 flex justify-end" : "p-4 border-t border-base-300 flex justify-end"}>
        <button
          onClick={onCancel}
          className="btn btn-ghost"
        >
          Cancel
        </button>
      </div>
    </div>
  )

  if (layout === "panel") return content
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-type-modal-title"
      onKeyDown={handleKeyDown}
    >
      {content}
    </div>
  )
}
