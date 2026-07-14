import React from "react"
import type { CustomPinType, Pin } from "../types"
import type { PinSearchExcerpt } from "../utils/pinSearchExcerpt"
import { HighlightedExcerpt } from "./HighlightedExcerpt"
import PinTypeBadge from "./PinTypeBadge"

type Props = {
  pin: Pin
  catalog: CustomPinType[]
  excerpt?: PinSearchExcerpt | null
  /** Show community name under the title (PinPicker). Default false. */
  showCommunity?: boolean
}

/** Shared pin suggestion row: legend-colored type icon, title, optional community/excerpt. */
export default function PinSuggestionOption({
  pin,
  catalog,
  excerpt = null,
  showCommunity = false,
}: Props) {
  return (
    <>
      <PinTypeBadge pinType={pin.pin_type} catalog={catalog} className="mt-0.5" />
      <span className="min-w-0 flex-1">
        <span className="font-medium line-clamp-1">{pin.title}</span>
        {showCommunity && pin.community ? (
          <span className="mt-0.5 block text-xs text-base-content/70">{pin.community.name}</span>
        ) : null}
        {excerpt ? (
          <span className="mt-0.5 block text-xs text-base-content/70 line-clamp-1">
            <HighlightedExcerpt excerpt={excerpt} />
          </span>
        ) : null}
      </span>
    </>
  )
}
