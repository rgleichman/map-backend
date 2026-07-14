import React from "react"
import type { PinSearchExcerpt } from "../utils/pinSearchExcerpt"

const MARK_CLASS = "bg-primary/20 text-base-content rounded px-0.5 not-italic"

export type SubstringMatch = {
  before: string
  match: string
  after: string
}

/** Case-insensitive first-substring split for highlight rendering. */
export function splitSubstringMatch(text: string, query: string): SubstringMatch | null {
  const q = query.trim()
  if (!q) return null
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx < 0) return null
  return {
    before: text.slice(0, idx),
    match: text.slice(idx, idx + q.length),
    after: text.slice(idx + q.length),
  }
}

export function HighlightedExcerpt({ excerpt }: { excerpt: PinSearchExcerpt }) {
  return (
    <>
      {excerpt.before}
      <mark className={MARK_CLASS}>{excerpt.match}</mark>
      {excerpt.after}
    </>
  )
}

/** Highlight the first case-insensitive occurrence of `query` in `text`. */
export function HighlightedMatch({ text, query }: { text: string; query: string }) {
  const parts = splitSubstringMatch(text, query)
  if (!parts) return <>{text}</>
  return (
    <>
      {parts.before}
      <mark className={MARK_CLASS}>{parts.match}</mark>
      {parts.after}
    </>
  )
}
