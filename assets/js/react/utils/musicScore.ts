export const MUSIC_SCORE_VERSION = 1 as const
export const DEFAULT_TEMPO = 120
export const MIN_TEMPO = 40
export const MAX_TEMPO = 220
export const DEFAULT_STEPS = 16
export const DEFAULT_NOTES = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"] as const

export type MusicScoreRow = {
  note: string
  hits: boolean[]
}

export type MusicScore = {
  version: typeof MUSIC_SCORE_VERSION
  tempo: number
  steps: number
  rows: MusicScoreRow[]
}

export function clampTempo(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_TEMPO
  return Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, Math.round(value)))
}

export function emptyScore(
  steps: number = DEFAULT_STEPS,
  notes: readonly string[] = DEFAULT_NOTES,
  tempo: number = DEFAULT_TEMPO
): MusicScore {
  return {
    version: MUSIC_SCORE_VERSION,
    tempo,
    steps,
    rows: notes.map((note) => ({ note, hits: Array.from({ length: steps }, () => false) })),
  }
}

export function scoreHasContent(score: MusicScore): boolean {
  return score.rows.some((row) => row.hits.some(Boolean))
}

/** One-step score used for pad / note preview. */
export function singleNoteScore(note: string, tempo: number = DEFAULT_TEMPO): MusicScore {
  return {
    version: MUSIC_SCORE_VERSION,
    tempo,
    steps: 1,
    rows: [{ note, hits: [true] }],
  }
}

/** Slice one grid column into its own 1-step score (same voice as full playback). */
export function scoreAtStep(score: MusicScore, stepIndex: number): MusicScore | null {
  if (stepIndex < 0 || stepIndex >= score.steps) return null
  return {
    version: score.version,
    tempo: score.tempo,
    steps: 1,
    rows: score.rows.map((row) => ({
      note: row.note,
      hits: [row.hits[stepIndex] === true],
    })),
  }
}

export function cloneScore(score: MusicScore): MusicScore {
  return {
    version: score.version,
    tempo: score.tempo,
    steps: score.steps,
    rows: score.rows.map((row) => ({ note: row.note, hits: [...row.hits] })),
  }
}

function normalizeHits(hits: unknown[], steps: number): boolean[] {
  const out = Array.from({ length: steps }, () => false)
  for (let i = 0; i < Math.min(steps, hits.length); i++) {
    out[i] = hits[i] === true
  }
  return out
}

/** Parse a v1 grid score JSON payload (or empty → emptyScore). */
export function parseScore(payload: string): MusicScore {
  const trimmed = payload.trim()
  if (trimmed === "") return emptyScore()

  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>
    if (obj.version !== MUSIC_SCORE_VERSION || !Array.isArray(obj.rows)) {
      return emptyScore()
    }

    const tempo =
      typeof obj.tempo === "number" && obj.tempo > 0 ? clampTempo(obj.tempo) : DEFAULT_TEMPO
    const steps =
      typeof obj.steps === "number" && obj.steps > 0
        ? Math.min(32, Math.max(1, Math.round(obj.steps)))
        : DEFAULT_STEPS
    const rowsRaw = obj.rows as unknown[]
    const rows: MusicScoreRow[] = DEFAULT_NOTES.map((note) => ({
      note,
      hits: Array.from({ length: steps }, () => false),
    }))
    const rowByNote = new Map(rows.map((row, idx) => [row.note.toUpperCase(), idx]))

    for (const entry of rowsRaw) {
      if (entry == null || typeof entry !== "object") continue
      const rec = entry as Record<string, unknown>
      const note = typeof rec.note === "string" ? rec.note.trim() : ""
      if (!note) continue
      const idx = rowByNote.get(note.toUpperCase())
      if (idx == null) continue
      rows[idx].hits = normalizeHits(Array.isArray(rec.hits) ? rec.hits : [], steps)
    }

    return { version: MUSIC_SCORE_VERSION, tempo, steps, rows }
  } catch {
    return emptyScore()
  }
}

export function serializeScore(score: MusicScore): string {
  const payload = {
    version: MUSIC_SCORE_VERSION,
    tempo: score.tempo,
    steps: score.steps,
    rows: score.rows.map((row) => ({
      note: row.note,
      hits: row.hits,
    })),
  }
  return JSON.stringify(payload)
}
