import React from "react"
import type { PinType } from "../types"
import { usePinTypes } from "../context/PinTypesContext"
import { builtinIconKeyForPinType } from "../utils/builtinPinType"
import PinTypeIcon from "./PinTypeIcon"
import Button from "./ui/Button"
import { getPinTypeConfig, resolvePinTypeConfig } from "../utils/pinTypeIcons"

type Props = {
  onSelectType: (type: PinType) => void
  onCancel: () => void
}

export default function PinTypeModal({ onSelectType, onCancel }: Props) {
  const { catalog, selectableTypes } = usePinTypes()

  return (
    <div className="flex w-full flex-col">
      <div className="border-b border-base-300 pb-4">
        <h2 id="pin-type-modal-title" className="text-lg font-semibold text-base-content">
          What type of pin is this?
        </h2>
      </div>

      <div className="space-y-3 py-4">
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
              type="button"
              onClick={() => onSelectType(type)}
              className="w-full rounded-lg border-2 border-base-300 p-4 text-left text-base-content transition-colors hover:border-primary hover:bg-base-200"
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: config.backgroundColor,
                    border: `2px solid ${config.borderColor}`,
                    color: config.textColor,
                  }}
                >
                  <PinTypeIcon pinType={type} size={24} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-base-content">{config.label}</h3>
                  <p className="mt-1 text-sm text-base-content/80">
                    {config.description || builtinConfig.description}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex justify-end border-t border-base-300 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
