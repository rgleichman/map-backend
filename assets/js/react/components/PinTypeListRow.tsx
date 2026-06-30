import React from "react"
import type { CustomPinType, PinType } from "../types"
import { resolvePinTypeConfig } from "../utils/pinTypeIcons"
import PinTypeIcon from "./PinTypeIcon"

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
      <span
        className={[
          "rounded-full flex items-center justify-center shrink-0",
          compact ? "w-6 h-6" : "w-8 h-8",
        ].join(" ")}
        aria-hidden
        style={{
          backgroundColor: config.color,
          border: `2px solid ${config.borderColor}`,
          color: config.textColor,
        }}
      >
        <PinTypeIcon pinType={pinType} size={compact ? 16 : 20} catalog={catalog} />
      </span>
      <span className="font-medium">{config.label}</span>
    </button>
  )
}
