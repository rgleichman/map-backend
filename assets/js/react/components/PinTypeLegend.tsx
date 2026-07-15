import React from "react"
import type { PinType } from "../types"
import { usePinTypes } from "../context/PinTypesContext"
import { mapShellPinTypeLegendMaxHeight } from "../utils/siteLayout"
import PinTypePickerList from "./PinTypePickerList"
import FloatingPanel from "./FloatingPanel"
import Button from "./ui/Button"
import { PencilIcon } from "./ui/icons"

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
      <Button
        href="/pin-types"
        variant="primary"
        size="sm"
        className="w-full mt-1.5 shrink-0 inline-flex items-center justify-center gap-1.5"
      >
        <PencilIcon className="size-4" />
        Add or Edit pin types
      </Button>
    </FloatingPanel>
  )
}
