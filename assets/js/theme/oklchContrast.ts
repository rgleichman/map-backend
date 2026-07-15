/** OKLCH parsing and WCAG 2.1 relative-luminance contrast helpers for theme tokens. */

export type Oklch = { L: number; C: number; H: number }

const OKLCH_RE = /oklch\(\s*([\d.]+)\s*%?\s+([\d.]+)\s+([\d.]+)\s*\)/i

export function parseOklch(value: string): Oklch {
  const m = value.trim().match(OKLCH_RE)
  if (!m) throw new Error(`Expected oklch(...) got: ${value}`)
  let L = Number(m[1])
  // Percent form (93.98%) or values > 1 are L in 0–100.
  if (/%/.test(value) || L > 1) L /= 100
  return { L, C: Number(m[2]), H: Number(m[3]) }
}

function oklchToLinearSrgb({ L, C, H }: Oklch): { r: number; g: number; b: number } {
  const hRad = (H * Math.PI) / 180
  const a = C * Math.cos(hRad)
  const b = C * Math.sin(hRad)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  return {
    r: 4.0767416621 * l - 3.2107903887 * m + 0.1405789889 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  }
}

function linearToSrgb(c: number): number {
  const clipped = Math.min(1, Math.max(0, c))
  return clipped <= 0.0031308 ? 12.92 * clipped : 1.055 * Math.pow(clipped, 1 / 2.4) - 0.055
}

function relativeLuminance(lin: { r: number; g: number; b: number }): number {
  const channel = (linComponent: number) => {
    const srgb = linearToSrgb(linComponent)
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(lin.r) + 0.7152 * channel(lin.g) + 0.0722 * channel(lin.b)
}

/** WCAG 2.1 contrast ratio between two OKLCH colors (opaque). */
export function contrastRatio(foreground: Oklch, background: Oklch): number {
  const L1 = relativeLuminance(oklchToLinearSrgb(foreground))
  const L2 = relativeLuminance(oklchToLinearSrgb(background))
  const lighter = Math.max(L1, L2)
  const darker = Math.min(L1, L2)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Blend `fg` over `bg` in linear sRGB at `alpha` (0–1). */
export function mixOver(fg: Oklch, bg: Oklch, alpha: number): { r: number; g: number; b: number } {
  const f = oklchToLinearSrgb(fg)
  const b = oklchToLinearSrgb(bg)
  return {
    r: f.r * alpha + b.r * (1 - alpha),
    g: f.g * alpha + b.g * (1 - alpha),
    b: f.b * alpha + b.b * (1 - alpha),
  }
}

export function contrastAgainstLinear(
  foreground: Oklch,
  backgroundLinear: { r: number; g: number; b: number },
): number {
  const L1 = relativeLuminance(oklchToLinearSrgb(foreground))
  const L2 = relativeLuminance(backgroundLinear)
  const lighter = Math.max(L1, L2)
  const darker = Math.min(L1, L2)
  return (lighter + 0.05) / (darker + 0.05)
}

/** DaisyUI soft button: color text on ~8% color mixed into base-100. */
export function softButtonContrast(color: Oklch, base100: Oklch): number {
  return contrastAgainstLinear(color, mixOver(color, base100, 0.08))
}

/** Tinted chip: color text on alpha% color over base-100. */
export function tintedTextContrast(color: Oklch, base100: Oklch, alpha = 0.15): number {
  return contrastAgainstLinear(color, mixOver(color, base100, alpha))
}

export type ThemeTokens = Record<string, Oklch>

/**
 * Parse daisyUI `@plugin "...daisyui-theme" { name: "..."; --color-*: oklch(...); }`
 * blocks from app.css into named token maps.
 */
export function parseDaisyThemeBlocks(css: string): Record<string, ThemeTokens> {
  const themes: Record<string, ThemeTokens> = {}
  const pluginStart = /@plugin\s+"[^"]*daisyui-theme"\s*\{/g
  let startMatch: RegExpExecArray | null

  while ((startMatch = pluginStart.exec(css)) !== null) {
    const openBrace = startMatch.index + startMatch[0].length - 1
    let depth = 0
    let end = -1
    for (let i = openBrace; i < css.length; i++) {
      const ch = css[i]
      if (ch === "{") depth++
      else if (ch === "}") {
        depth--
        if (depth === 0) {
          end = i
          break
        }
      }
    }
    if (end < 0) continue
    const body = css.slice(openBrace + 1, end)
    const nameMatch = body.match(/name:\s*"([^"]+)"/)
    if (!nameMatch) continue
    const tokens: ThemeTokens = {}
    const varRe = /--color-([a-z0-9-]+):\s*(oklch\([^)]+\))/gi
    let varMatch: RegExpExecArray | null
    while ((varMatch = varRe.exec(body)) !== null) {
      tokens[varMatch[1]] = parseOklch(varMatch[2])
    }
    themes[nameMatch[1]] = tokens
  }
  return themes
}

/** WCAG AA normal-text minimum. */
export const WCAG_AA_TEXT = 4.5

/** WCAG AA UI / large-text minimum. */
export const WCAG_AA_UI = 3
