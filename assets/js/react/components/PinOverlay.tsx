import React from "react"
import {
  DESKTOP_PIN_PANEL_CLASSES,
  desktopPinPanelFloatingStyle,
  PIN_FLOATING_CARD_CLASSES,
} from "../utils/siteLayout"

export type PinOverlayVariant = "panel" | "modal"

type Props = {
  variant: PinOverlayVariant
  onClose: () => void
  /** Accessible name when content has no stable labelledby id. */
  "aria-label"?: string
  "aria-labelledby"?: string
  children: React.ReactNode
}

const MODAL_CARD_CLASSES = [
  PIN_FLOATING_CARD_CLASSES,
  "w-full max-w-md max-h-modal-mobile-90 overflow-y-auto overscroll-contain p-4",
].join(" ")

function handleEscape(
  e: React.KeyboardEvent,
  onClose: () => void,
): void {
  if (e.key !== "Escape") return
  e.preventDefault()
  e.stopPropagation()
  onClose()
}

/**
 * Shared shell for pin type / composer / detail UI.
 * - panel: floating desktop right rail
 * - modal: centered mobile card with backdrop
 */
export default function PinOverlay({
  variant,
  onClose,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  children,
}: Props) {
  if (variant === "panel") {
    return (
      <div
        className={DESKTOP_PIN_PANEL_CLASSES}
        style={desktopPinPanelFloatingStyle()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
        onKeyDown={(e) => handleEscape(e, onClose)}
      >
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      tabIndex={-1}
      onKeyDown={(e) => handleEscape(e, onClose)}
    >
      <div className={MODAL_CARD_CLASSES}>{children}</div>
    </div>
  )
}
