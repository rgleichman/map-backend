export const MUSIC_SCORE_VERSION = 1 as const
export const DEFAULT_TEMPO = 120
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

export function cloneScore(score: MusicScore): MusicScore {
  return {
    version: score.version,
    tempo: score.tempo,
    steps: score.steps,
    rows: score.rows.map((row) => ({ note: row.note, hits: [...row.hits] })),
  }
}

function isGridPayload(obj: Record<string, unknown>): boolean {
  return obj.version === 1 && Array.isArray(obj.rows)
}

function normalizeHits(hits: unknown[], steps: number): boolean[] {
  const out = Array.from({ length: steps }, () => false)
  for (let i = 0; i < Math.min(steps, hits.length); i++) {
    out[i] = hits[i] === true
  }
  return out
}

function notesToScore(notes: string[], tempo: number, steps: number = DEFAULT_STEPS): MusicScore {
  const score = emptyScore(steps, DEFAULT_NOTES, tempo)
  const rowByNote = new Map(score.rows.map((row, idx) => [row.note.toUpperCase(), idx]))
  let col = 0
  for (const raw of notes) {
    const note = raw.trim()
    if (!note) continue
    const rowIdx = rowByNote.get(note.toUpperCase())
    if (rowIdx == null) continue
    if (col >= steps) break
    score.rows[rowIdx].hits[col] = true
    col += 1
  }
  return score
}

/**
 * Parse any supported payload (plain text, legacy JSON notes, or v1 grid) into a score.
 */
export function parseScore(payload: string): MusicScore {
  const trimmed = payload.trim()
  if (trimmed === "") return emptyScore()

  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>
      const tempo =
        typeof obj.tempo === "number" && obj.tempo > 0 ? Math.round(obj.tempo) : DEFAULT_TEMPO

      if (isGridPayload(obj)) {
        const steps =
          typeof obj.steps === "number" && obj.steps > 0
            ? Math.min(32, Math.max(4, Math.round(obj.steps)))
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
      }

      if (Array.isArray(obj.notes)) {
        return notesToScore(obj.notes.map(String), tempo)
      }
    } catch {
      // fall through to plain text
    }
  }

  const tokens = trimmed.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean)
  return notesToScore(tokens, DEFAULT_TEMPO)
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

/** Legacy-friendly note list for simple sequential playback fallbacks. */
export function scoreToNoteList(score: MusicScore): string[] {
  const notes: string[] = []
  for (let step = 0; step < score.steps; step++) {
    for (const row of score.rows) {
      if (row.hits[step]) notes.push(row.note)
    }
  }
  return notes
}

export type ParsedMusicPayload = {
  tempo: number
  notes: string[]
  score: MusicScore | null
}

export function parseMusicPayload(payload: string): ParsedMusicPayload {
  const trimmed = payload.trim()
  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>
      if (isGridPayload(obj)) {
        const score = parseScore(trimmed)
        return { tempo: score.tempo, notes: scoreToNoteList(score), score }
      }
      const tempo =
        typeof obj.tempo === "number" && obj.tempo > 0 ? obj.tempo : DEFAULT_TEMPO
      const notes = Array.isArray(obj.notes) ? obj.notes.map(String) : []
      return { tempo, notes, score: null }
    } catch {
      // fall through
    }
  }
  const tokens = trimmed.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean)
  return { tempo: DEFAULT_TEMPO, notes: tokens, score: null }
}
