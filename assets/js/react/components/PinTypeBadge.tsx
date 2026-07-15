import React from "react"
import type { CustomPinType, PinType } from "../types"
import { resolvePinTypeConfig } from "../utils/pinTypeIcons"
import PinTypeIcon from "./PinTypeIcon"

type BadgeSize = "sm" | "md"

const SIZE: Record<BadgeSize, { box: string; icon: number }> = {
  sm: { box: "w-6 h-6", icon: 14 },
  md: { box: "w-8 h-8", icon: 20 },
}

type Props = {
  pinType: PinType | null | undefined
  catalog?: CustomPinType[]
  /** sm matches filter/search chips; md matches the full legend row. */
  size?: BadgeSize
  className?: string
}

/** Colored circular pin-type badge (same treatment as the map legend). */
export default function PinTypeBadge({
  pinType,
  catalog = [],
  size = "sm",
  className,
}: Props) {
  const config = resolvePinTypeConfig(pinType, catalog)
  const { box, icon } = SIZE[size]

  return (
    <span
      className={["rounded-full flex items-center justify-center shrink-0", box, className]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
      style={{
        backgroundColor: config.color,
        border: `2px solid ${config.borderColor}`,
        color: config.textColor,
      }}
    >
      <PinTypeIcon pinType={pinType} size={icon} />
    </span>
  )
}
