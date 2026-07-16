import React, { useEffect, useId, useRef } from "react"
import Button from "./Button"
import CloseButton from "./CloseButton"
import { TrashIcon } from "./icons"

type Props = {
  open: boolean
  title: string
  body: string
  confirmLabel?: string
  cancelLabel?: string
  confirming?: boolean
  /** `danger` for destructive actions (default); `warning` for non-destructive confirms. */
  tone?: "danger" | "warning"
  confirmingLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  confirming = false,
  tone = "danger",
  confirmingLabel,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const isDanger = tone === "danger"
  const busyLabel = confirmingLabel ?? (isDanger ? "Deleting…" : "Working…")

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="bg-base-100 text-base-content border border-base-300 shadow-xl w-full sm:max-w-md sm:rounded-xl rounded-t-lg p-6 flex flex-col overscroll-contain">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2
            id={titleId}
            className={[
              "text-lg font-semibold",
              isDanger ? "text-error" : "text-base-content",
            ].join(" ")}
          >
            {title}
          </h2>
          <CloseButton aria-label="Close confirmation" onClick={onCancel} disabled={confirming} />
        </div>
        <p className="text-sm text-base-content/80 mb-6">{body}</p>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            ref={cancelRef}
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={confirming}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={isDanger ? "danger" : "primary"}
            size="sm"
            onClick={onConfirm}
            disabled={confirming}
            className="inline-flex items-center gap-1.5"
          >
            {isDanger ? <TrashIcon className="size-4" /> : null}
            {confirming ? busyLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
