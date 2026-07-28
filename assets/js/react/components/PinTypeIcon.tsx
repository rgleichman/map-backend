import React from "react"
import type { CatalogPinType, PinType } from "../types"
import { usePinTypes } from "../context/PinTypesContext"
import { ICON_PATH_DEFS, isStrokeIcon, pinIconName } from "../utils/pinTypeIcons"
import { findPinType } from "../utils/customPinTypes"

type Props = {
  pinType: PinType | null | undefined
  size?: number
  catalog?: CatalogPinType[]
}

/** Renders the catalog pin-type glyph. Inherit color from the parent (e.g. PinTypeBadge). */
export default function PinTypeIcon({
  pinType,
  size = 24,
  catalog: catalogProp,
}: Props): React.ReactElement {
  const { catalog: contextCatalog } = usePinTypes()
  const catalog = catalogProp ?? contextCatalog
  const catalogType = findPinType(pinType, catalog)
  const iconKey = pinIconName(catalogType?.icon, pinType)
  const stroke = isStrokeIcon(iconKey)
  const paths = ICON_PATH_DEFS[iconKey]

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={stroke ? "none" : "currentColor"}
      stroke={stroke ? "currentColor" : undefined}
      aria-hidden
      width={size}
      height={size}
    >
      {stroke ? (
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
