import React from "react"
import type { CustomPinType, PinType } from "../types"
import { BuiltinPinType, builtinIconKeyForPinType } from "../utils/builtinPinType"
import { ICON_PATH_DEFS, resolvePinTypeConfig } from "../utils/pinTypeIcons"

type Props = {
  pinType: PinType | null | undefined
  className?: string
  size?: number
  catalog?: CustomPinType[]
}

/** Renders the SVG icon for a pin type. Size defaults to 24. */
export default function PinTypeIcon({
  pinType,
  className,
  size = 24,
  catalog = [],
}: Props): React.ReactElement {
  const config = resolvePinTypeConfig(pinType, catalog)
  const iconKey = builtinIconKeyForPinType(pinType)
  const isStrokeIcon = iconKey === BuiltinPinType.OneTime
  const paths = ICON_PATH_DEFS[iconKey]

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={isStrokeIcon ? "none" : "currentColor"}
      stroke={isStrokeIcon ? "currentColor" : undefined}
      style={isStrokeIcon ? { color: config.textColor } : undefined}
      aria-hidden
      width={size}
      height={size}
      className={className}
    >
      {isStrokeIcon ? (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          color={config.textColor}
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
