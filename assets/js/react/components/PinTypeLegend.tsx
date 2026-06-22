import React from "react"
import type { PinType } from "../types"
import { useIsDesktop } from "../hooks/useMediaQuery"
import { usePinTypes } from "../context/PinTypesContext"
import PinTypeListRow from "./PinTypeListRow"
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
  const { catalog, selectableTypes } = usePinTypes()

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
        {selectableTypes.map((pinType) => (
          <PinTypeListRow
            key={pinType}
            pinType={pinType}
            catalog={catalog}
            selected={selectedPinType === pinType}
            onClick={() => onTogglePinType?.(pinType)}
          />
        ))}
      </div>
      <p className="text-xs text-base-content/80 mt-3 italic">
        Different colors show different pin types.
      </p>
      <a href="/pin-types" className="btn btn-sm btn-outline w-full mt-2">
        Add or Edit pin types
      </a>
    </FloatingPanel>
  )
}
