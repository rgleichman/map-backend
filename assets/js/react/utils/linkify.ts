export type LinkifiedSegment =
  | { kind: "text"; value: string }
  | { kind: "link"; label: string; href: string }

// Hostname with a letter-only TLD (avoids matching version numbers like 1.2.3).
const DOMAIN_HOST =
  String.raw`[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}`
const DOMAIN = String.raw`(?:www\.)?${DOMAIN_HOST}`
const EMAIL = String.raw`[a-zA-Z0-9._%+-]+@${DOMAIN_HOST}`

const MARKDOWN_LINK_RE = new RegExp(
  String.raw`\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|${EMAIL}|${DOMAIN}(?:\/[^\s)]*)?)\)`,
  "gi"
)
const BARE_URL_RE = new RegExp(
  String.raw`(?:mailto:[^\s<]+|${EMAIL}|https?:\/\/[^\s<]+|${DOMAIN}(?:\/[^\s<]*)?)`,
  "gi"
)
const TRAILING_PUNCTUATION_RE = /[.,;:!?'")\]]+$/
const HOSTNAME_RE =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/
const EMAIL_ANCHORED_RE = new RegExp(String.raw`^${EMAIL}$`)
const MAILTO_HREF_RE = new RegExp(
  String.raw`^mailto:${EMAIL}(?:\?[a-zA-Z0-9_\-.*=&%+]*)?$`,
  "i"
)

const ALLOWED_SCHEMES = new Set(["http", "https", "mailto"])
const DISALLOWED_SCHEME_BEFORE_RE =
  /(?:ftp|file|javascript|data|vbscript):[^\s]*$/i
const MAX_MAILTO_LEN = 2048
const EXPLICIT_SCHEME_RE = /^([a-zA-Z][a-zA-Z0-9+.-]*):/
const ASCII_SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:$/

export function sanitizeLinkInput(url: string): string {
  return url.trim().normalize("NFKC")
}

export function isMailtoHref(href: string): boolean {
  return sanitizeLinkInput(href).toLowerCase().startsWith("mailto:")
}

function explicitScheme(url: string): string | null | "invalid" {
  const match = url.match(EXPLICIT_SCHEME_RE)
  if (!match) return null
  const prefix = match[0]
  if (!ASCII_SCHEME_RE.test(prefix)) return "invalid"
  return match[1].toLowerCase()
}

function isValidMailto(url: string): boolean {
  if (url.length > MAX_MAILTO_LEN) return false
  return MAILTO_HREF_RE.test(url)
}

function isValidWebUrl(url: string): boolean {
  try {
    const parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false
    if (!parsed.hostname.includes(".")) return false
    return HOSTNAME_RE.test(parsed.hostname)
  } catch {
    return false
  }
}

export function normalizeUrl(url: string): string {
  const sanitized = sanitizeLinkInput(url)
  if (sanitized.toLowerCase().startsWith("mailto:")) return sanitized
  if (/^https?:\/\//i.test(sanitized)) return sanitized
  if (EMAIL_ANCHORED_RE.test(sanitized)) return `mailto:${sanitized}`
  return `https://${sanitized}`
}

export function isSafeUrl(url: string): boolean {
  const sanitized = sanitizeLinkInput(url)
  if (sanitized === "") return false

  const scheme = explicitScheme(sanitized)
  if (scheme === "invalid") return false
  if (scheme && !ALLOWED_SCHEMES.has(scheme)) return false

  if (sanitized.toLowerCase().startsWith("mailto:")) {
    return isValidMailto(sanitized)
  }

  if (scheme === "http" || scheme === "https") {
    return isValidWebUrl(sanitized)
  }

  if (EMAIL_ANCHORED_RE.test(sanitized)) return true

  return isValidWebUrl(sanitized)
}

function hasDisallowedSchemePrefix(text: string, start: number): boolean {
  return DISALLOWED_SCHEME_BEFORE_RE.test(text.slice(0, start))
}

function splitBareUrls(text: string): LinkifiedSegment[] {
  const segments: LinkifiedSegment[] = []
  let lastIndex = 0

  for (const match of text.matchAll(BARE_URL_RE)) {
    const raw = match[0]
    const start = match.index ?? 0

    if (start > lastIndex) {
      segments.push({ kind: "text", value: text.slice(lastIndex, start) })
    }

    const trailing = raw.match(TRAILING_PUNCTUATION_RE)?.[0] ?? ""
    const candidate = trailing ? raw.slice(0, -trailing.length) : raw

    if (isSafeUrl(candidate) && !hasDisallowedSchemePrefix(text, start)) {
      segments.push({ kind: "link", label: candidate, href: normalizeUrl(candidate) })
      if (trailing) {
        segments.push({ kind: "text", value: trailing })
      }
    } else {
      segments.push({ kind: "text", value: raw })
    }

    lastIndex = start + raw.length
  }

  if (lastIndex < text.length) {
    segments.push({ kind: "text", value: text.slice(lastIndex) })
  }

  return segments
}

export function parseLinkifiedText(text: string): LinkifiedSegment[] {
  if (text === "") return []

  const segments: LinkifiedSegment[] = []
  let lastIndex = 0

  for (const match of text.matchAll(MARKDOWN_LINK_RE)) {
    const label = match[1]
    const url = match[2].trim()
    const start = match.index ?? 0

    if (start > lastIndex) {
      segments.push(...splitBareUrls(text.slice(lastIndex, start)))
    }

    if (isSafeUrl(url)) {
      segments.push({ kind: "link", label, href: normalizeUrl(url) })
    } else {
      segments.push({ kind: "text", value: match[0] })
    }

    lastIndex = start + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push(...splitBareUrls(text.slice(lastIndex)))
  }

  return segments.length > 0 ? segments : [{ kind: "text", value: text }]
}
