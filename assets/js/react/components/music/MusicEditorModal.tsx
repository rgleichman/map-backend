import React, { useEffect } from "react"
import { createPortal } from "react-dom"
import MusicSequencer from "./MusicSequencer"
import type { MusicScore } from "../../utils/musicScore"
import { SITE_HEADER_FIXED_PANEL_CLASSES } from "../../utils/siteLayout"

type Props = {
  open: boolean
  fieldLabel: string
  score: MusicScore
  onChange: (score: MusicScore) => void
  onDone: () => void | Promise<void>
  disabled?: boolean
  saving?: boolean
  error?: string | null
  isDesktop: boolean
}

export default function MusicEditorModal({
  open,
  fieldLabel,
  score,
  onChange,
  onDone,
  disabled = false,
  saving = false,
  error = null,
  isDesktop,
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
        <button
          type="button"
          className="btn btn-sm btn-primary shrink-0"
          onClick={() => void onDone()}
          disabled={disabled || saving}
        >
          {saving ? "Saving…" : "Done"}
        </button>
      </div>
      {error ? (
        <div className="shrink-0 border-b border-base-300 px-4 py-2 text-xs text-error">{error}</div>
      ) : null}
      <div className="flex-1 overflow-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-3xl">
          <MusicSequencer score={score} onChange={onChange} disabled={disabled} />
        </div>
      </div>
    </div>,
    document.body
  )
}
