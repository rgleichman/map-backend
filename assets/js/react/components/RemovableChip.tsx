import React from "react"
import {
  CHIP_DISMISS_BUTTON_CLASS,
  REMOVABLE_CHIP_CLASS,
  REMOVABLE_CHIP_CONTENT_CLASS,
  REMOVABLE_CHIP_PAD_END_CLASS,
} from "../utils/mapUiClasses"

function ChipDismissIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
    </svg>
  )
}

type ChipDismissButtonProps = {
  onClick: () => void
  "aria-label": string
}

export function ChipDismissButton({ onClick, "aria-label": ariaLabel }: ChipDismissButtonProps) {
  return (
    <button
      type="button"
      className={CHIP_DISMISS_BUTTON_CLASS}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <ChipDismissIcon />
    </button>
  )
}

type Props = {
  children: React.ReactNode
  onRemove?: () => void
  removeLabel?: string
  className?: string
  title?: string
}

export default function RemovableChip({
  children,
  onRemove,
  removeLabel,
  className,
  title,
}: Props) {
  const removable = onRemove != null && removeLabel != null
  return (
    <span
      className={[
        REMOVABLE_CHIP_CLASS,
        removable ? "pr-1" : REMOVABLE_CHIP_PAD_END_CLASS,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      title={title}
    >
      <span className={REMOVABLE_CHIP_CONTENT_CLASS}>{children}</span>
      {removable ? (
        <ChipDismissButton aria-label={removeLabel} onClick={onRemove} />
      ) : null}
    </span>
  )
}
