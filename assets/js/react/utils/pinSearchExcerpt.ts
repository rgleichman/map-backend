import type { CustomPinType, Pin } from "../types"
import type { CustomFieldSearchHit } from "./customFieldSearch"
import { customFieldSearchHits } from "./customFieldSearch"

export type PinSearchExcerpt = {
  source: "tag" | "description" | "custom_field"
  before: string
  match: string
  after: string
}

const EXCERPT_WINDOW = 90
const EXCERPT_HALF = 40

export function titleMatchesQuery(pin: Pin, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (q === "") return false
  return pin.title.toLowerCase().includes(q)
}

function splitAtMatch(text: string, query: string): Omit<PinSearchExcerpt, "source"> | null {
  const q = query.trim().toLowerCase()
  if (q === "") return null
  const lower = text.toLowerCase()
  const idx = lower.indexOf(q)
  if (idx === -1) return null
  return {
    before: text.slice(0, idx),
    match: text.slice(idx, idx + q.length),
    after: text.slice(idx + q.length),
  }
}

/** Collapse whitespace and strip lightweight markdown for display excerpts. */
export function normalizeDescriptionForExcerpt(description: string): string {
  return description
    .replace(/\r?\n+/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function descriptionExcerpt(description: string, query: string): PinSearchExcerpt | null {
  const normalized = normalizeDescriptionForExcerpt(description)
  const q = query.trim()
  if (q === "" || normalized === "") return null

  const lower = normalized.toLowerCase()
  const qLower = q.toLowerCase()
  const matchIdx = lower.indexOf(qLower)
  if (matchIdx === -1) return null

  let start = Math.max(0, matchIdx - EXCERPT_HALF)
  let end = Math.min(normalized.length, matchIdx + q.length + EXCERPT_HALF)

  if (end - start > EXCERPT_WINDOW) {
    end = start + EXCERPT_WINDOW
  }

  const prefixEllipsis = start > 0
  const suffixEllipsis = end < normalized.length

  if (start > 0) {
    const space = normalized.indexOf(" ", start)
    if (space !== -1 && space < matchIdx) start = space + 1
  }
  if (end < normalized.length) {
    const space = normalized.lastIndexOf(" ", end)
    if (space !== -1 && space > matchIdx + q.length) end = space
  }

  const window = normalized.slice(start, end)
  const matchInWindow = matchIdx - start
  const before = (prefixEllipsis ? "…" : "") + window.slice(0, matchInWindow)
  const match = window.slice(matchInWindow, matchInWindow + q.length)
  const after = window.slice(matchInWindow + q.length) + (suffixEllipsis ? "…" : "")

  return { source: "description", before, match, after }
}

function customFieldExcerpt(hit: CustomFieldSearchHit, query: string): PinSearchExcerpt | null {
  const split = splitAtMatch(hit.text, query)
  if (!split) return null
  const prefix = `${hit.field.label}: `
  return {
    source: "custom_field",
    before: prefix + split.before,
    match: split.match,
    after: split.after,
  }
}

export function pinSearchExcerpt(pin: Pin, query: string, catalog: CustomPinType[] = []): PinSearchExcerpt | null {
  const q = query.trim()
  if (q === "" || titleMatchesQuery(pin, q)) return null

  const matchingTag = pin.tags?.find((tag) => tag.toLowerCase().includes(q.toLowerCase()))
  if (matchingTag) {
    const split = splitAtMatch(matchingTag, q)
    if (split) return { ...split, source: "tag" }
  }

  for (const hit of customFieldSearchHits(pin, catalog)) {
    if (hit.text.toLowerCase().includes(q.toLowerCase())) {
      const excerpt = customFieldExcerpt(hit, q)
      if (excerpt) return excerpt
    }
  }

  if (pin.description) {
    const excerpt = descriptionExcerpt(pin.description, q)
    if (excerpt) return excerpt
  }

  return null
}
