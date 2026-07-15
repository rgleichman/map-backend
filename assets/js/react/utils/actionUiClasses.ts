/** Shared action button class tokens (React map UI) — canvas-like look, theme colors. */

export type ActionBtnVariant = "primary" | "action" | "ghost" | "danger" | "dangerOutline"

export type ActionBtnSize = "md" | "sm" | "xs"

/**
 * Canvas-style base: no daisyUI `btn` (avoids default borders / transform quirks).
 * Press shrinks from the center via `origin-center` + `active:scale-[0.9]`.
 * Use `active:` (not `enabled:active:`) so link Buttons animate — anchors never
 * match `:enabled`. Disabled already uses `pointer-events-none`.
 *
 * Note: Tailwind only has preset durations (…1000). Custom = `duration-[1050ms]`.
 * Press-in speed is `active:duration-*`; base `duration-*` is mainly the release.
 */
export const ACTION_BTN_BASE_CLASS = [
  "inline-flex items-center justify-center gap-1.5 shrink-0",
  "rounded-md font-medium leading-none cursor-pointer select-none",
  "shadow-none",
  "origin-center will-change-transform",
  "transition-[background-color,color,opacity,filter,transform,box-shadow,border-color] duration-150 ease-out",
  "active:scale-[0.9] active:duration-75",
  "disabled:pointer-events-none disabled:opacity-50",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
  "focus-visible:ring-offset-2 focus-visible:ring-offset-base-100",
].join(" ")

const VARIANT_CLASS: Record<ActionBtnVariant, string> = {
  primary: "border-0 bg-primary text-primary-content hover:brightness-[0.88]",
  action:
    "border-0 bg-action text-action-content hover:brightness-[0.88] focus-visible:ring-action/40",
  ghost:
    "border-0 bg-transparent text-base-content hover:bg-base-200/80 dark:hover:bg-base-300/60",
  danger: "border-0 bg-error text-error-content hover:brightness-[0.9]",
  // Only outline variant keeps a border (intentional affordance).
  dangerOutline:
    "bg-transparent text-error border border-solid border-error hover:bg-error/10",
}

const SIZE_CLASS: Record<ActionBtnSize, string> = {
  md: "min-h-9 px-3.5 text-sm",
  sm: "min-h-7 px-3 text-[13px]",
  xs: "min-h-6 px-2 text-xs",
}

export function actionBtnClass(
  variant: ActionBtnVariant,
  size: ActionBtnSize = "md",
  ...extra: Array<string | false | null | undefined>
): string {
  return [ACTION_BTN_BASE_CLASS, VARIANT_CLASS[variant], SIZE_CLASS[size], ...extra]
    .filter(Boolean)
    .join(" ")
}

/** Icon-only dismiss — borderless wash, matches canvas chip dismiss more than daisy btn-circle. */
export const CLOSE_BTN_CLASS = [
  ACTION_BTN_BASE_CLASS,
  "size-8 min-h-8 p-0 rounded-full border-0 group text-base-content/70",
  "hover:bg-base-200/90 dark:hover:bg-base-300/70 hover:text-base-content",
].join(" ")

export const CLOSE_BTN_SQUARE_CLASS = [
  ACTION_BTN_BASE_CLASS,
  "size-9 min-h-9 min-w-9 p-0 rounded-md border-0 group text-base-content/70",
  "hover:bg-base-200/90 dark:hover:bg-base-300/70 hover:text-base-content",
].join(" ")

export const CLOSE_ICON_CLASS = "size-4 opacity-70 group-hover:opacity-100 transition-opacity"
