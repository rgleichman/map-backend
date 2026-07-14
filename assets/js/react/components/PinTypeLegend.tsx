import React from "react"
import type { PinType } from "../types"
import { usePinTypes } from "../context/PinTypesContext"
import { mapShellPinTypeLegendMaxHeight } from "../utils/siteLayout"
import PinTypePickerList from "./PinTypePickerList"
import FloatingPanel from "./FloatingPanel"

type Props = {
  /** When set, that row is highlighted (same source as map Filters). */
  selectedPinType?: PinType | null
  /** Toggle: same type again clears the filter. */
  onTogglePinType?: (type: PinType) => void
  closeRef?: React.RefObject<{ close(): void } | null>
}

export default function PinTypeLegend({ selectedPinType = null, onTogglePinType, closeRef }: Props) {
  const { catalog, selectableTypes } = usePinTypes()

  return (
    <FloatingPanel
      triggerLabel="Pin types"
      triggerAriaLabel="Show pin types legend"
      title="Pin Types"
      closeAriaLabel="Close legend"
      closeRef={closeRef}
      compact
      maxHeight={mapShellPinTypeLegendMaxHeight()}
    >
      <PinTypePickerList
        className="flex-1 min-h-0 overflow-y-auto"
        pinTypes={selectableTypes}
        catalog={catalog}
        selectedPinType={selectedPinType}
        onTogglePinType={(pinType) => onTogglePinType?.(pinType)}
        compact
      />
      <a href="/pin-types" className="btn btn-sm btn-outline w-full mt-1.5 shrink-0">
        Add or Edit pin types
      </a>
    </FloatingPanel>
  )
}
