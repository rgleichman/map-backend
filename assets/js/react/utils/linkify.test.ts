import { describe, expect, it } from "vitest"
import { isSafeUrl, normalizeUrl, parseLinkifiedText } from "./linkify"

describe("normalizeUrl", () => {
  it("adds https to scheme-less domains", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com")
    expect(normalizeUrl("www.example.com/path")).toBe("https://www.example.com/path")
  })

  it("adds mailto to bare email addresses", () => {
    expect(normalizeUrl("team@example.com")).toBe("mailto:team@example.com")
  })

  it("leaves explicit schemes unchanged", () => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com")
    expect(normalizeUrl("http://example.com")).toBe("http://example.com")
    expect(normalizeUrl("mailto:a@b.com")).toBe("mailto:a@b.com")
  })
})

describe("isSafeUrl", () => {
  it("allows http and https URLs", () => {
    expect(isSafeUrl("https://example.com")).toBe(true)
    expect(isSafeUrl("http://example.com/path")).toBe(true)
  })

  it("allows scheme-less domains", () => {
    expect(isSafeUrl("example.com")).toBe(true)
    expect(isSafeUrl("www.example.com/about")).toBe(true)
  })

  it("allows bare email addresses", () => {
    expect(isSafeUrl("team@example.com")).toBe(true)
  })

  it("allows mailto URLs", () => {
    expect(isSafeUrl("mailto:user@example.com")).toBe(true)
  })

  it("rejects disallowed schemes", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false)
    expect(isSafeUrl("data:text/html,hello")).toBe(false)
    expect(isSafeUrl("ftp://example.com")).toBe(false)
    expect(isSafeUrl("file:///etc/passwd")).toBe(false)
  })

  it("rejects malformed mailto URLs", () => {
    expect(isSafeUrl("mailto:javascript:alert(1)")).toBe(false)
    expect(isSafeUrl("mailto:")).toBe(false)
    expect(isSafeUrl("mailto:?subject=Hello")).toBe(false)
  })

  it("allows mailto with optional query params", () => {
    expect(isSafeUrl("mailto:team@example.com?subject=Hello")).toBe(true)
  })
})

describe("parseLinkifiedText", () => {
  it("parses markdown links", () => {
    expect(parseLinkifiedText("Visit [site](https://example.com) today.")).toEqual([
      { kind: "text", value: "Visit " },
      { kind: "link", label: "site", href: "https://example.com" },
      { kind: "text", value: " today." },
    ])
  })

  it("parses markdown links without a scheme", () => {
    expect(parseLinkifiedText("Visit [site](example.com) today.")).toEqual([
      { kind: "text", value: "Visit " },
      { kind: "link", label: "site", href: "https://example.com" },
      { kind: "text", value: " today." },
    ])
  })

  it("autolinks bare URLs", () => {
    expect(parseLinkifiedText("See https://example.com for details.")).toEqual([
      { kind: "text", value: "See " },
      { kind: "link", label: "https://example.com", href: "https://example.com" },
      { kind: "text", value: " for details." },
    ])
  })

  it("autolinks scheme-less domains", () => {
    expect(parseLinkifiedText("See example.com for details.")).toEqual([
      { kind: "text", value: "See " },
      { kind: "link", label: "example.com", href: "https://example.com" },
      { kind: "text", value: " for details." },
    ])
  })

  it("autolinks bare mailto URLs", () => {
    expect(parseLinkifiedText("Email mailto:team@example.com today.")).toEqual([
      { kind: "text", value: "Email " },
      { kind: "link", label: "mailto:team@example.com", href: "mailto:team@example.com" },
      { kind: "text", value: " today." },
    ])
  })

  it("autolinks bare email addresses", () => {
    expect(parseLinkifiedText("Contact team@example.com for info.")).toEqual([
      { kind: "text", value: "Contact " },
      { kind: "link", label: "team@example.com", href: "mailto:team@example.com" },
      { kind: "text", value: " for info." },
    ])
  })

  it("parses markdown email links", () => {
    expect(parseLinkifiedText("[Email us](team@example.com)")).toEqual([
      { kind: "link", label: "Email us", href: "mailto:team@example.com" },
    ])
  })

  it("strips trailing punctuation from bare URLs", () => {
    expect(parseLinkifiedText("Go to example.com.")).toEqual([
      { kind: "text", value: "Go to " },
      { kind: "link", label: "example.com", href: "https://example.com" },
      { kind: "text", value: "." },
    ])
  })

  it("leaves unsafe markdown URLs as plain text", () => {
    expect(parseLinkifiedText("[click](javascript:alert(1))")).toEqual([
      { kind: "text", value: "[click](javascript:alert(1))" },
    ])
  })

  it("leaves unsafe bare URLs as plain text", () => {
    expect(parseLinkifiedText("javascript:alert(1)")).toEqual([
      { kind: "text", value: "javascript:alert(1)" },
    ])
  })

  it("leaves malformed mailto as plain text", () => {
    expect(parseLinkifiedText("mailto:javascript:alert(1)")).toEqual([
      { kind: "text", value: "mailto:javascript:alert(1)" },
    ])
  })

  it("does not autolink domains after disallowed schemes", () => {
    for (const input of ["[site](ftp://example.com)", "ftp://example.com"]) {
      const segments = parseLinkifiedText(input)
      expect(segments.every((s) => s.kind === "text")).toBe(true)
      expect(segments.map((s) => (s.kind === "text" ? s.value : "")).join("")).toBe(input)
    }
  })

  it("returns plain text when there are no links", () => {
    expect(parseLinkifiedText("Just a description.")).toEqual([
      { kind: "text", value: "Just a description." },
    ])
  })
})
