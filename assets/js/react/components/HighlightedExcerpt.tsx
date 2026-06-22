import React from "react"
import type { PinSearchExcerpt } from "../utils/pinSearchExcerpt"

export function HighlightedExcerpt({ excerpt }: { excerpt: PinSearchExcerpt }) {
  return (
    <>
      {excerpt.before}
      <mark className="bg-primary/20 text-base-content rounded px-0.5 not-italic">{excerpt.match}</mark>
      {excerpt.after}
    </>
  )
}
