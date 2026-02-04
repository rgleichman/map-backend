import React, { useEffect, useRef } from "react"

export default function LoginRequiredModal({ onClose }: { onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-required-title"
    >
      <div className="pin-modal-content rounded-lg min-w-[300px] shadow-xl p-6 bg-base-100 text-base-content border border-base-300 overscroll-contain">
        <h2 id="login-required-title" className="text-lg font-semibold mb-4">Login Required</h2>
        <p className="mb-6">You must be logged in to add new locations to the map.</p>
        <div className="flex gap-2 justify-end">
          <button type="button" ref={closeButtonRef} onClick={onClose} className="btn">Close</button>
        </div>
      </div>
    </div>
  )
}
