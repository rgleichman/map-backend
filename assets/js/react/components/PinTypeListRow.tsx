import React from "react"
import type { CustomPinType, PinType } from "../types"
import { resolvePinTypeConfig } from "../utils/pinTypeIcons"
import PinTypeIcon from "./PinTypeIcon"

type Props = {
  pinType: PinType
  catalog: CustomPinType[]
  selected?: boolean
  onClick?: () => void
}

export default function PinTypeListRow({ pinType, catalog, selected = false, onClick }: Props) {
  const config = resolvePinTypeConfig(pinType, catalog)

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        "flex w-full items-center gap-2.5 text-left text-sm rounded-xl transition min-h-[44px] py-2 px-2.5",
        selected
          ? "bg-primary text-primary-content"
          : "bg-base-200 text-base-content hover:bg-base-300 dark:hover:bg-base-300/80",
      ].join(" ")}
    >
      <span
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        aria-hidden
        style={{
          backgroundColor: config.color,
          border: `2px solid ${config.borderColor}`,
          color: config.textColor,
        }}
      >
        <PinTypeIcon pinType={pinType} size={20} catalog={catalog} />
      </span>
      <span className="font-medium">{config.label}</span>
    </button>
  )
}
