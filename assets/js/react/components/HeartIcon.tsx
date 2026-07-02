import React from "react"

type Props = {
  filled?: boolean
  size?: number
  className?: string
}

export default function HeartIcon({ filled = false, size = 16, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
      className={className}
    >
      <path
        d="M8 13.5s-4.5-3-5.5-5.5C1.5 5.5 3.5 3.5 6 4c1 .4 1.5 1 2 1.5.5-.5 1-1.1 2-1.5 2.5-.5 4.5 1.5 3.5 4C12.5 10.5 8 13.5 8 13.5z"
        strokeLinejoin="round"
      />
    </svg>
  )
}
