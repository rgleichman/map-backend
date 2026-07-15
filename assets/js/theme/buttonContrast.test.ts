import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import {
  WCAG_AA_TEXT,
  WCAG_AA_UI,
  contrastRatio,
  parseDaisyThemeBlocks,
  softButtonContrast,
  tintedTextContrast,
  type ThemeTokens,
} from "./oklchContrast"

const cssPath = join(dirname(fileURLToPath(import.meta.url)), "../../css/app.css")

const BUTTON_COLOR_KEYS = [
  "primary",
  "secondary",
  "accent",
  "neutral",
  "info",
  "success",
  "warning",
  "error",
] as const

function requireToken(theme: ThemeTokens, key: string) {
  const t = theme[key]
  if (!t) throw new Error(`Missing --color-${key}`)
  return t
}

describe("daisyUI theme button contrast (app.css)", () => {
  const css = readFileSync(cssPath, "utf8")
  const themes = parseDaisyThemeBlocks(css)

  it("parses light and dark theme token blocks", () => {
    expect(Object.keys(themes).sort()).toEqual(["dark", "light"])
    expect(themes.light.primary).toBeDefined()
    expect(themes.dark.primary).toBeDefined()
  })

  it.each(["light", "dark"] as const)(
    "%s: filled, outline, and soft buttons meet WCAG AA text (4.5:1)",
    (themeName) => {
      const theme = themes[themeName]
      const base100 = requireToken(theme, "base-100")
      const failures: string[] = []

      for (const key of BUTTON_COLOR_KEYS) {
        if (!(key in theme) || !(`${key}-content` in theme)) continue
        const color = requireToken(theme, key)
        const content = requireToken(theme, `${key}-content`)

        const filled = contrastRatio(content, color)
        if (filled < WCAG_AA_TEXT) {
          failures.push(`${key} filled content/color ${filled.toFixed(2)}:1`)
        }

        const outline = contrastRatio(color, base100)
        if (outline < WCAG_AA_TEXT) {
          failures.push(`${key} outline color/base-100 ${outline.toFixed(2)}:1`)
        }

        const soft = softButtonContrast(color, base100)
        if (soft < WCAG_AA_TEXT) {
          failures.push(`${key} soft color-on-8% ${soft.toFixed(2)}:1`)
        }
      }

      expect(failures, failures.join("; ") || "ok").toEqual([])
    },
  )

  it("light: primary (fern) tinted text on primary/15 meets AA text", () => {
    const theme = themes.light
    const primary = requireToken(theme, "primary")
    const base100 = requireToken(theme, "base-100")
    const tint = tintedTextContrast(primary, base100, 0.15)
    expect(tint).toBeGreaterThanOrEqual(WCAG_AA_TEXT)
  })

  it("dark: primary/error tinted text on color/15 meets AA UI (3:1); chips use base-content for body text", () => {
    const theme = themes.dark
    const base100 = requireToken(theme, "base-100")
    for (const key of ["primary", "error"] as const) {
      const color = requireToken(theme, key)
      const tint = tintedTextContrast(color, base100, 0.15)
      expect(tint, `${key} tint`).toBeGreaterThanOrEqual(WCAG_AA_UI)
    }
  })

  it("both themes: base-content on base-100/200 meets AAA body text", () => {
    for (const themeName of ["light", "dark"] as const) {
      const theme = themes[themeName]
      const content = requireToken(theme, "base-content")
      for (const surface of ["base-100", "base-200"] as const) {
        const bg = requireToken(theme, surface)
        expect(
          contrastRatio(content, bg),
          `${themeName} base-content on ${surface}`,
        ).toBeGreaterThanOrEqual(7)
      }
    }
  })
})
