import React, { useId } from "react"
import {
  MAP_OVERLAY_CONTROL_ACTIVE_CLASS,
  MAP_OVERLAY_CONTROL_CLASS,
} from "../utils/mapUiClasses"

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
        className={pressed ? MAP_OVERLAY_CONTROL_ACTIVE_CLASS : MAP_OVERLAY_CONTROL_CLASS}
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
        <p id={hintId} className="text-[11px] leading-snug text-base-content/60 text-right max-w-[11rem]">
          Open a pin to see its connections
        </p>
      )}
    </div>
  )
}
