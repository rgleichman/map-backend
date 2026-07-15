import type { Pin } from "../types"

/** localStorage key prefix for per-map last-visit watermarks. */
export const LAST_VISIT_STORAGE_PREFIX = "mapgarden:lastVisitV1:"

/** In-tab cache so Strict Mode remounts / scope revisits do not re-advance the watermark. */
const sessionWatermarks = new Map<string, Date | null>()

/** Fallback when localStorage is unavailable (SSR / vitest node). */
const memoryStore = new Map<string, string>()

export function lastVisitStorageKey(scope: string): string {
  return `${LAST_VISIT_STORAGE_PREFIX}${scope}`
}

/** Test helper: clear in-memory session cache only (keeps persisted watermark). */
export function clearLastVisitSessionCache(): void {
  sessionWatermarks.clear()
}

/** Test helper: clear session cache and in-memory fallback store. */
export function resetLastVisitStorageForTests(): void {
  sessionWatermarks.clear()
  memoryStore.clear()
}

function storageGet(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key)
    }
  } catch {
    // ignore
  }
  return memoryStore.get(key) ?? null
}

function storageSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value)
      return
    }
  } catch {
    // ignore quota / private mode; fall through to memory
  }
  memoryStore.set(key, value)
}

/**
 * Read the previous visit watermark for this map scope, then write "now" for the next visit.
 * Returns null on first visit.
 * Idempotent within the current page session for a given scope.
 */
export function takeLastVisitWatermark(scope: string, nowMs: number = Date.now()): Date | null {
  if (sessionWatermarks.has(scope)) {
    return sessionWatermarks.get(scope) ?? null
  }

  const key = lastVisitStorageKey(scope)
  let previous: Date | null = null
  const raw = storageGet(key)
  if (raw != null) {
    const ms = Number(raw)
    if (Number.isFinite(ms)) previous = new Date(ms)
  }
  storageSet(key, String(nowMs))
  sessionWatermarks.set(scope, previous)
  return previous
}

/** True when the pin was created or edited after the last-visit watermark. */
export function isPinNewSince(pin: Pin, watermark: Date | null): boolean {
  if (watermark == null) return false
  const updatedAt = pin.updated_at
  if (updatedAt == null || updatedAt === "") return false
  const ms = Date.parse(updatedAt)
  if (!Number.isFinite(ms)) return false
  return ms > watermark.getTime()
}

/** Test helper: read stored watermark ms for a scope (localStorage or memory fallback). */
export function peekLastVisitStoredMs(scope: string): number | null {
  const raw = storageGet(lastVisitStorageKey(scope))
  if (raw == null) return null
  const ms = Number(raw)
  return Number.isFinite(ms) ? ms : null
}
