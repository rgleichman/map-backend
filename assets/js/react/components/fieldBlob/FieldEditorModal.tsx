import React, { useEffect } from "react"
import { createPortal } from "react-dom"
import { SITE_HEADER_FIXED_PANEL_CLASSES } from "../../utils/siteLayout"
import Button from "../ui/Button"

type Props = {
  open: boolean
  fieldLabel: string
  onDone: () => void | Promise<void>
  disabled?: boolean
  saving?: boolean
  error?: string | null
  isDesktop: boolean
  children: React.ReactNode
  /** When true, content area uses flex fill so children (e.g. drawing canvas) can expand. */
  fillAvailable?: boolean
}

export default function FieldEditorModal({
  open,
  fieldLabel,
  onDone,
  disabled = false,
  saving = false,
  error = null,
  isDesktop,
  children,
  fillAvailable = false,
}: Props) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) void onDone()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open, onDone, saving])

  if (!open) return null

  const panelClasses = isDesktop
    ? `fixed left-0 z-[60] flex flex-col bg-base-100 border-r border-base-300 shadow-xl ${SITE_HEADER_FIXED_PANEL_CLASSES} md:right-[28rem]`
    : "fixed inset-0 z-[60] flex flex-col bg-base-100"

  return createPortal(
    <div
      className={panelClasses}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${fieldLabel}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-base-300 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h3 className="text-base font-semibold text-base-content truncate">{fieldLabel}</h3>
        {!isDesktop ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="shrink-0"
            onClick={() => void onDone()}
            disabled={disabled || saving}
          >
            {saving ? "Saving…" : "Done"}
          </Button>
        ) : null}
      </div>
      {error ? (
        <div className="shrink-0 border-b border-base-300 px-4 py-2 text-xs text-error">{error}</div>
      ) : null}
      <div
        className={
          fillAvailable
            ? [
              "flex flex-1 min-h-0 flex-col py-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:py-4",
              // Mobile must scroll (finger gutter beside canvas); desktop fills without page scroll.
              isDesktop
                ? "overflow-hidden px-4"
                : "overflow-y-auto overscroll-contain px-2",
            ].join(" ")
            : "flex-1 overflow-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        }
      >
        <div
          className={
            fillAvailable
              ? isDesktop
                ? "flex min-h-0 w-full flex-1 flex-col"
                : "flex w-full flex-col"
              : "mx-auto max-w-3xl"
          }
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
