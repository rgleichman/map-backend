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

/** Shared shell content area: children own scroll + padding (e.g. composer footer). */
const CONTENT_SHELL_CLASSES = "flex min-h-0 flex-1 flex-col overflow-hidden"

const MODAL_CARD_CLASSES = [
  PIN_FLOATING_CARD_CLASSES,
  "flex min-h-0 w-full max-w-md max-h-modal-mobile-90 flex-col overflow-hidden",
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
        <div className={CONTENT_SHELL_CLASSES}>{children}</div>
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
