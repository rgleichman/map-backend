import React, { useState } from "react"
import LoginRequiredModal from "../LoginRequiredModal"
import HeartIcon from "../HeartIcon"
import type { ToggleHeartResult } from "../../hooks/usePinHearts"

type Props = {
  hearted: boolean
  disabled?: boolean
  onToggle: () => Promise<ToggleHeartResult>
}

export default function PinHeartButton({ hearted, disabled = false, onToggle }: Props) {
  const [loginOpen, setLoginOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleClick = async () => {
    if (busy || disabled) return
    setBusy(true)
    try {
      const result = await onToggle()
      if (result.needsLogin) setLoginOpen(true)
    } catch {
      // parent may surface api errors; button rolls back via hook
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={busy || disabled}
        aria-pressed={hearted}
        aria-label={hearted ? "Remove from saved pins" : "Save pin"}
        className={[
          "inline-flex items-center gap-1.5 rounded px-2 py-1.5 border-none cursor-pointer font-semibold transition-colors",
          hearted
            ? "bg-error/15 text-error hover:bg-error/25"
            : "bg-base-200 text-base-content hover:opacity-90",
          (busy || disabled) && "opacity-60 cursor-not-allowed",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <HeartIcon filled={hearted} className="shrink-0" />
        <span>{hearted ? "Saved" : "Save"}</span>
      </button>
      {loginOpen && (
        <LoginRequiredModal
          message="Log in to save pins."
          onClose={() => setLoginOpen(false)}
        />
      )}
    </>
  )
}
