import React, { useEffect, useRef, type ReactNode } from "react"
import Button from "./ui/Button"
import CloseButton from "./ui/CloseButton"

export function LoginLink({ children = "log in" }: { children?: ReactNode }) {
  return (
    <a href="/users/log-in" className="link link-primary font-medium">
      {children}
    </a>
  )
}

export default function LoginRequiredModal({
  onClose,
  message = (
    <>
      You must <LoginLink /> to add new locations to the map.
    </>
  ),
}: {
  onClose: () => void
  message?: ReactNode
}) {
  const signInRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    signInRef.current?.focus()
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
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 id="login-required-title" className="text-lg font-semibold">
            Login Required
          </h2>
          <CloseButton aria-label="Close login required dialog" onClick={onClose} />
        </div>
        <p className="mb-6">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button ref={signInRef} href="/users/log-in" variant="primary">
            Sign in
          </Button>
        </div>
      </div>
    </div>
  )
}
