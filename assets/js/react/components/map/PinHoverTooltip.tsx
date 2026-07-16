import React, { useLayoutEffect } from "react"
import type { Pin } from "../../types"
import PinTypeBadge from "../PinTypeBadge"
import { usePinTypes } from "../../context/PinTypesContext"
import { getPinTypeLabel } from "../../utils/pinTypeIcons"

type Props = {
  pin: Pin
  onOpen: () => void
  /** Fires after content is laid out so the host can reveal the popup. */
  onReady?: () => void
}

/** Lightweight desktop hover tooltip: title + type only (no media). */
export default function PinHoverTooltip({ pin, onOpen, onReady }: Props) {
  const { catalog } = usePinTypes()
  const typeLabel = getPinTypeLabel(pin.pin_type, catalog)

  useLayoutEffect(() => {
    onReady?.()
  }, [onReady, pin.id])

  return (
    <div
      role="button"
      tabIndex={0}
      className="min-w-[10rem] max-w-[16rem] cursor-pointer"
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return
        e.preventDefault()
        e.stopPropagation()
        onOpen()
      }}
    >
      <div className="flex items-start gap-2">
        <PinTypeBadge pinType={pin.pin_type} catalog={catalog} size="sm" className="mt-0.5" />
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-snug text-base-content truncate">{pin.title}</p>
          <p className="text-xs text-base-content/70 mt-0.5">{typeLabel}</p>
        </div>
      </div>
    </div>
  )
}
