import React from "react"
import type { CustomPinType, PinType } from "../types"
import PinTypeListRow from "./PinTypeListRow"

type Props = {
  pinTypes: PinType[]
  catalog: CustomPinType[]
  selectedPinType?: PinType | null
  onTogglePinType: (pinType: PinType) => void
  compact?: boolean
  className?: string
}

export default function PinTypePickerList({
  pinTypes,
  catalog,
  selectedPinType = null,
  onTogglePinType,
  compact = false,
  className,
}: Props) {
  return (
    <div className={["space-y-0.5", className].filter(Boolean).join(" ")}>
      {pinTypes.map((pinType) => (
        <PinTypeListRow
          key={pinType}
          pinType={pinType}
          catalog={catalog}
          selected={selectedPinType === pinType}
          onClick={() => onTogglePinType(pinType)}
          compact={compact}
        />
      ))}
    </div>
  )
}
