import React from "react"
import type { PinType } from "../types"
import { BuiltinPinType, builtinIconKeyForPinType } from "../utils/builtinPinType"
import { ICON_PATH_DEFS } from "../utils/pinTypeIcons"

type Props = {
  pinType: PinType | null | undefined
  size?: number
}

/** Renders the builtin pin-type glyph. Inherit color from the parent (e.g. PinTypeBadge). */
export default function PinTypeIcon({
  pinType,
  size = 24,
}: Props): React.ReactElement {
  const iconKey = builtinIconKeyForPinType(pinType)
  const isStrokeIcon = iconKey === BuiltinPinType.OneTime
  const paths = ICON_PATH_DEFS[iconKey]

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={isStrokeIcon ? "none" : "currentColor"}
      stroke={isStrokeIcon ? "currentColor" : undefined}
      aria-hidden
      width={size}
      height={size}
    >
      {isStrokeIcon ? (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {paths.map((p) => (
            <path key={p.d} d={p.d} />
          ))}
        </g>
      ) : (
        <g fill="currentColor">
          {paths.map((p) => (
            <path key={p.d} d={p.d} fillRule={p.fillRule} clipRule={p.clipRule} />
          ))}
        </g>
      )}
    </svg>
  )
}
