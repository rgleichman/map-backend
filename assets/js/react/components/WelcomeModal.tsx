import React, { useEffect, useRef, useState } from "react"

const GITHUB_ISSUES_NEW_URL = "https://github.com/rgleichman/map-backend/issues/new/choose"

type Props = {
  onClose: () => void
}

export default function WelcomeModal({ onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle")

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose()
  }

  const handleTellAFriend = async () => {
    const url = typeof window !== "undefined" ? window.location.origin || window.location.href : ""
    const shareData = {
      title: "Map Garden",
      text: "Check out Map Garden — a community map for points of interest, events, and local resources.",
      url,
    }

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData)
        return
      } catch {
        // User cancelled or share failed; fall through to copy.
      }
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        setShareStatus("copied")
        window.setTimeout(() => setShareStatus("idle"), 2000)
      } else {
        setShareStatus("error")
        window.setTimeout(() => setShareStatus("idle"), 2500)
      }
    } catch {
      setShareStatus("error")
      window.setTimeout(() => setShareStatus("idle"), 2500)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div className="bg-base-100 text-base-content border border-base-300 shadow-xl w-full sm:max-w-lg sm:rounded-lg rounded-t-lg max-h-[90vh] flex flex-col overscroll-contain">
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-base-300">
          <h2 id="welcome-modal-title" className="text-xl font-semibold">
            Welcome to Map Garden!
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Close welcome dialog"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-4 text-sm sm:text-base">
          <p>
            Welcome to Map Garden! Map Garden is a developing web app. Currently, it allows people to
            create points of interest across the globe, with pin types for scheduled events, recurring
            offerings, and community resources.
          </p>

          <div className="space-y-2">
            <h3 className="text-base font-semibold">Map Guide:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Click and drag to interact with the map.</li>
              <li>
                Use <span className="font-medium">Sign in</span> in the top right to create an account so you can create pins.
              </li>
              <li>Use the search control in the map top-left to find pins or places.</li>
              <li>
                Search finds pins by name, description, or tag, and places by address or location.
              </li>
              <li>
                Use the filter button in the map top-right to filter by pin type and other unique qualities.
              </li>
              <li>Note the key in the lower-left for understanding the pin types you are seeing.</li>
              <li>
                Clicking on the various pin types described by the key allows you to select them as a filter.
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-semibold">Top Bar Guide</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <span className="font-medium">Party Mode:</span> Try it yourself!
              </li>
              <li>
                <span className="font-medium">Sign in:</span> Create an account or return to yours (same
                form).
              </li>
              <li>
                <span className="font-medium">Light/Dark Mode:</span> Toggle the map between match system
                settings, light mode, or dark mode.
              </li>
            </ul>
          </div>

          <p className="italic text-base-content/80">
            The Map Garden team has many plans and even more ideas for Map Garden...
          </p>
        </div>

        <div className="px-5 py-4 border-t border-base-300 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleTellAFriend}>
              {shareStatus === "copied"
                ? "Link copied!"
                : shareStatus === "error"
                  ? "Couldn't copy"
                  : "Tell a friend"}
            </button>
            <a
              href={GITHUB_ISSUES_NEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
            >
              Report an issue
            </a>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            className="btn btn-primary"
          >
            Get started
          </button>
        </div>
      </div>
    </div>
  )
}
