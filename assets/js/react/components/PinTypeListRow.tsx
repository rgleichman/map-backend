import React from "react"
import type { CustomPinType, PinType } from "../types"
import { resolvePinTypeConfig } from "../utils/pinTypeIcons"
import { filterChipToneClass } from "../utils/mapUiClasses"
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
  const description = config.description?.trim() || null
  const showDescription = selected && description != null

  return (
    <button
      type="button"
      aria-pressed={selected}
      title={description ?? undefined}
      onClick={onClick}
      className={[
        "flex w-full text-left transition",
        showDescription ? "items-start" : "items-center",
        compact
          ? "gap-2 text-xs rounded-lg min-h-0 py-1 px-2"
          : "gap-2.5 text-sm rounded-xl min-h-[44px] py-2 px-2.5",
        filterChipToneClass(selected),
      ].join(" ")}
    >
      <PinTypeBadge
        pinType={pinType}
        catalog={catalog}
        size={compact ? "sm" : "md"}
        className={showDescription ? "mt-0.5 shrink-0" : "shrink-0"}
      />
      <span className="min-w-0 flex-1 flex flex-col gap-0.5">
        <span className="font-medium">{config.label}</span>
        {showDescription && (
          <span
            className={[
              "font-normal",
              compact ? "text-[10px] leading-snug" : "text-xs leading-snug",
            ].join(" ")}
          >
            {description}
          </span>
        )}
      </span>
    </button>
  )
}
