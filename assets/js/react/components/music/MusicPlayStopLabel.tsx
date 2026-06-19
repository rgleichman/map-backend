import React from "react"

type Props = {
  playing: boolean
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6.5 4.75a.75.75 0 0 1 1.15-.634l7.5 5.25a.75.75 0 0 1 0 1.234l-7.5 5.25A.75.75 0 0 1 6.5 15.25V4.75Z" />
    </svg>
  )
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M5.5 5.5h9v9h-9v-9Z" />
    </svg>
  )
}

export default function MusicPlayStopLabel({ playing }: Props) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {playing ? (
        <StopIcon className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <PlayIcon className="h-3.5 w-3.5 shrink-0" />
      )}
      {playing ? "Stop" : "Play"}
    </span>
  )
}
