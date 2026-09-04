import React from "react"
import {
  CHIP_DISMISS_BUTTON_CLASS,
  REMOVABLE_CHIP_CLASS,
  REMOVABLE_CHIP_CONTENT_CLASS,
  REMOVABLE_CHIP_PAD_END_CLASS,
} from "../utils/mapUiClasses"

/** Whole-pill navigate button: chrome reset + hover wash + focus ring. */
const CHIP_CLICKABLE_CLASS = [
  "cursor-pointer border-none",
  "hover:bg-base-300 dark:hover:bg-base-200/90",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
  "focus-visible:ring-offset-1 focus-visible:ring-offset-base-100",
  "transition-colors",
].join(" ")

/** Content as navigate button when chip also has a dismiss sibling. */
const CHIP_CONTENT_BUTTON_CLASS = [
  REMOVABLE_CHIP_CONTENT_CLASS,
  "h-full flex-1 border-none bg-transparent cursor-pointer p-0 text-inherit",
  "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
  "focus-visible:ring-offset-1 focus-visible:ring-offset-base-100 rounded-full",
].join(" ")

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
  /** When set, the chip body navigates / activates (whole pill if not removable). */
  onClick?: () => void
  className?: string
  title?: string
}

export default function RemovableChip({
  children,
  onRemove,
  removeLabel,
  onClick,
  className,
  title,
}: Props) {
  const removable = onRemove != null && removeLabel != null
  const clickable = onClick != null
  const shellClass = [
    REMOVABLE_CHIP_CLASS,
    removable ? "pr-1" : REMOVABLE_CHIP_PAD_END_CLASS,
    clickable && !removable ? CHIP_CLICKABLE_CLASS : null,
    className,
  ]
    .filter(Boolean)
    .join(" ")

  const content = clickable && removable ? (
    <button type="button" className={CHIP_CONTENT_BUTTON_CLASS} onClick={onClick}>
      {children}
    </button>
  ) : (
    <span className={REMOVABLE_CHIP_CONTENT_CLASS}>{children}</span>
  )

  const dismiss = removable ? (
    <ChipDismissButton aria-label={removeLabel!} onClick={onRemove!} />
  ) : null

  if (clickable && !removable) {
    return (
      <button type="button" className={shellClass} title={title} onClick={onClick}>
        {content}
      </button>
    )
  }

  return (
    <span className={shellClass} title={title}>
      {content}
      {dismiss}
    </span>
  )
}
