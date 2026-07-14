import React from "react"
import type { CustomPinType, PinType } from "../types"
import { resolvePinTypeConfig } from "../utils/pinTypeIcons"
import PinTypeBadge from "./PinTypeBadge"

type Props = {
  pinType: PinType
  catalog: CustomPinType[]
  selected?: boolean
  onClick?: () => void
  compact?: boolean
}

export default function PinTypeListRow({
  pinType,
  catalog,
  selected = false,
  onClick,
  compact = false,
}: Props) {
  const config = resolvePinTypeConfig(pinType, catalog)

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        "flex w-full items-center text-left transition",
        compact
          ? "gap-2 text-xs rounded-lg min-h-0 py-1 px-2"
          : "gap-2.5 text-sm rounded-xl min-h-[44px] py-2 px-2.5",
        selected
          ? "bg-primary text-primary-content"
          : "bg-base-200 text-base-content hover:bg-base-300 dark:hover:bg-base-300/80",
      ].join(" ")}
    >
      <PinTypeBadge pinType={pinType} catalog={catalog} size={compact ? "sm" : "md"} />
      <span className="font-medium">{config.label}</span>
    </button>
  )
}
