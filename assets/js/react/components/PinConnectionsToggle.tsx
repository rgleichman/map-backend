import React, { useId } from "react"

type Props = {
  pressed: boolean
  onToggle: () => void
  globalCapped?: boolean
}

export default function PinConnectionsToggle({
  pressed,
  onToggle,
  globalCapped = false,
}: Props) {
  const hintId = useId()
  const showHint = pressed && globalCapped

  return (
    <div className="flex flex-col items-end gap-1 pointer-events-auto">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={pressed}
        aria-describedby={showHint ? hintId : undefined}
        className={[
          "inline-flex shrink-0 items-center gap-1.5 min-h-10 px-2.5 rounded-xl text-xs font-medium whitespace-nowrap border shadow-lg active:opacity-90 transition-colors",
          pressed
            ? "bg-primary text-primary-content border-primary hover:bg-primary/90"
            : "text-base-content bg-base-100/95 dark:bg-base-100/90 backdrop-blur-sm border-base-300 hover:bg-base-200/90 dark:hover:bg-base-200/85",
        ].join(" ")}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
          className={["shrink-0", pressed ? "opacity-100" : "opacity-80"].join(" ")}
        >
          <path d="M3 8h10M8 3v10" strokeLinecap="round" />
          <circle cx="3" cy="8" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="13" cy="8" r="1.5" fill="currentColor" stroke="none" />
        </svg>
        <span>Connections</span>
      </button>
      {showHint && (
        <p id={hintId} className="text-[10px] leading-snug text-base-content/60 text-right max-w-[11rem]">
          Open a pin to see its connections
        </p>
      )}
    </div>
  )
}
