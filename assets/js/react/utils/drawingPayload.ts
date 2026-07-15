import {
  DEFAULT_NOTES,
  DEFAULT_TEMPO,
  MUSIC_SCORE_VERSION,
  cloneScore,
  emptyScore,
  type MusicScore,
} from "./musicScore"

export const DRAWING_WIDTH = 256
export const DRAWING_HEIGHT = 256

export const MAX_DRAWING_FRAMES = 8
export const DEFAULT_DRAWING_FPS = 4
export const MIN_DRAWING_FPS = 1
export const MAX_DRAWING_FPS = 12

/** Semi-transparent ghost under the active frame (previous = cooler, next = warmer). */
export const ONION_PREV_OPACITY = 0.35
export const ONION_NEXT_OPACITY = 0.22
/** Cool tint = previous frame; warm tint = next. */
export const ONION_PREV_COLOR = "#2563eb"
export const ONION_NEXT_COLOR = "#d97706"

/**
 * Adjacent frame indexes for onion skin (null when missing / single-frame).
 * Order when painting: prev ghost → next ghost → active on top.
 */
export function onionNeighborIndexes(
  frameCount: number,
  frameIndex: number
): { prev: number | null; next: number | null } {
  if (frameCount <= 1) return { prev: null, next: null }
  const index = Math.max(0, Math.min(frameCount - 1, frameIndex))
  return {
    prev: index > 0 ? index - 1 : null,
    next: index < frameCount - 1 ? index + 1 : null,
  }
}

export const DrawingTool = {
  Pen: "pen",
  Eraser: "eraser",
} as const

export type DrawingTool = (typeof DrawingTool)[keyof typeof DrawingTool]

export type DrawingStroke = {
  tool: DrawingTool
  size: number
  points: [number, number][]
}

export type DrawingFrame = {
  strokes: DrawingStroke[]
}

/** In-memory drawing is always normalized to v2 with frames + soundtrack. */
export type DrawingData = {
  version: 2
  width: number
  height: number
  fps: number
  frames: DrawingFrame[]
  /** Sequencer grid; `steps` always equals `frames.length` after normalize. */
  soundtrack: MusicScore
}

export function emptyFrame(): DrawingFrame {
  return { strokes: [] }
}

export function emptyDrawing(): DrawingData {
  return {
    version: 2,
    width: DRAWING_WIDTH,
    height: DRAWING_HEIGHT,
    fps: DEFAULT_DRAWING_FPS,
    frames: [emptyFrame()],
    soundtrack: emptyScore(1),
  }
}

/**
 * Resize soundtrack columns to match frame count (1–MAX_DRAWING_FRAMES).
 * Preserves existing hits by index; pads or truncates as needed.
 */
export function resizeSoundtrack(score: MusicScore, frameCount: number): MusicScore {
  const steps = Math.max(1, Math.min(MAX_DRAWING_FRAMES, Math.round(frameCount)))
  const tempo =
    typeof score.tempo === "number" && score.tempo > 0 ? Math.round(score.tempo) : DEFAULT_TEMPO
  const next = emptyScore(steps, DEFAULT_NOTES, tempo)
  const rowByNote = new Map(next.rows.map((row, idx) => [row.note.toUpperCase(), idx]))
  for (const row of score.rows) {
    const idx = rowByNote.get(row.note.toUpperCase())
    if (idx == null) continue
    for (let i = 0; i < Math.min(steps, row.hits.length); i++) {
      next.rows[idx].hits[i] = row.hits[i] === true
    }
  }
  return next
}

/** Insert an empty hits column at `at` (0-based), then clamp to max frames. */
export function insertSoundtrackColumn(score: MusicScore, at: number): MusicScore {
  const next = cloneScore(score)
  const index = Math.max(0, Math.min(next.steps, at))
  for (const row of next.rows) {
    row.hits.splice(index, 0, false)
  }
  next.steps = next.rows[0]?.hits.length ?? next.steps + 1
  return resizeSoundtrack(next, Math.min(MAX_DRAWING_FRAMES, next.steps))
}

/** Remove hits column at `at`; keeps at least one column. */
export function removeSoundtrackColumn(score: MusicScore, at: number): MusicScore {
  if (score.steps <= 1) return resizeSoundtrack(score, 1)
  const next = cloneScore(score)
  const index = Math.max(0, Math.min(next.steps - 1, at))
  for (const row of next.rows) {
    row.hits.splice(index, 1)
  }
  next.steps = next.rows[0]?.hits.length ?? Math.max(1, next.steps - 1)
  return resizeSoundtrack(next, next.steps)
}

function normalizeSoundtrack(raw: unknown, frameCount: number): MusicScore {
  const steps = Math.max(1, Math.min(MAX_DRAWING_FRAMES, frameCount))
  if (raw == null || typeof raw !== "object") return emptyScore(steps)

  const obj = raw as Record<string, unknown>
  const tempo =
    typeof obj.tempo === "number" && obj.tempo > 0 ? Math.round(obj.tempo) : DEFAULT_TEMPO
  const base = emptyScore(steps, DEFAULT_NOTES, tempo)

  if (obj.version !== MUSIC_SCORE_VERSION || !Array.isArray(obj.rows)) {
    return base
  }

  const rowByNote = new Map(base.rows.map((row, idx) => [row.note.toUpperCase(), idx]))
  for (const entry of obj.rows) {
    if (entry == null || typeof entry !== "object") continue
    const rec = entry as Record<string, unknown>
    const note = typeof rec.note === "string" ? rec.note.trim() : ""
    if (!note) continue
    const idx = rowByNote.get(note.toUpperCase())
    if (idx == null) continue
    const hits = Array.isArray(rec.hits) ? rec.hits : []
    for (let i = 0; i < Math.min(steps, hits.length); i++) {
      base.rows[idx].hits[i] = hits[i] === true
    }
  }
  return base
}

export function frameHasContent(frame: DrawingFrame | undefined): boolean {
  return (frame?.strokes ?? []).some((stroke) => stroke.points.length >= 2)
}

export function drawingHasContent(data: DrawingData): boolean {
  return data.frames.some(frameHasContent)
}

export function clampDrawingFps(fps: number): number {
  if (!Number.isFinite(fps)) return DEFAULT_DRAWING_FPS
  return Math.min(MAX_DRAWING_FPS, Math.max(MIN_DRAWING_FPS, Math.round(fps)))
}

function normalizeStrokes(raw: unknown): DrawingStroke[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (stroke): stroke is DrawingStroke =>
        stroke != null &&
        typeof stroke === "object" &&
        (stroke.tool === DrawingTool.Pen || stroke.tool === DrawingTool.Eraser)
    )
    .map((stroke) => ({
      tool: stroke.tool as DrawingTool,
      size:
        typeof stroke.size === "number"
          ? stroke.size
          : stroke.tool === DrawingTool.Eraser
            ? 12
            : 2,
      points: (stroke.points ?? [])
        .filter((p): p is [number, number] => Array.isArray(p) && p.length === 2)
        .map(([x, y]) => [Number(x), Number(y)] as [number, number]),
    }))
}

function normalizeFrames(raw: unknown): DrawingFrame[] {
  if (!Array.isArray(raw) || raw.length === 0) return [emptyFrame()]
  return raw.slice(0, MAX_DRAWING_FRAMES).map((frame) => {
    if (frame != null && typeof frame === "object" && Array.isArray((frame as DrawingFrame).strokes)) {
      return { strokes: normalizeStrokes((frame as DrawingFrame).strokes) }
    }
    return emptyFrame()
  })
}

export function parseDrawing(payload: string): DrawingData {
  const trimmed = payload.trim()
  if (!trimmed) return emptyDrawing()
  try {
    const parsed = JSON.parse(trimmed) as {
      version?: number
      width?: number
      height?: number
      fps?: number
      strokes?: unknown
      frames?: unknown
      soundtrack?: unknown
    }
    const width = typeof parsed.width === "number" ? parsed.width : DRAWING_WIDTH
    const height = typeof parsed.height === "number" ? parsed.height : DRAWING_HEIGHT
    const fps = clampDrawingFps(
      typeof parsed.fps === "number" ? parsed.fps : DEFAULT_DRAWING_FPS
    )

    if (parsed.version === 1 && Array.isArray(parsed.strokes)) {
      const frames = [{ strokes: normalizeStrokes(parsed.strokes) }]
      return {
        version: 2,
        width,
        height,
        fps: DEFAULT_DRAWING_FPS,
        frames,
        soundtrack: normalizeSoundtrack(undefined, frames.length),
      }
    }

    if (parsed.version === 2 && Array.isArray(parsed.frames)) {
      const frames = normalizeFrames(parsed.frames)
      return {
        version: 2,
        width,
        height,
        fps,
        frames,
        soundtrack: normalizeSoundtrack(parsed.soundtrack, frames.length),
      }
    }

    return emptyDrawing()
  } catch {
    return emptyDrawing()
  }
}

export function serializeDrawing(data: DrawingData): string {
  const frames = data.frames.slice(0, MAX_DRAWING_FRAMES)
  const soundtrack = resizeSoundtrack(
    data.soundtrack ?? emptyScore(frames.length),
    frames.length
  )
  return JSON.stringify({
    version: 2,
    width: data.width,
    height: data.height,
    fps: clampDrawingFps(data.fps),
    frames: frames.map((frame) => ({
      strokes: frame.strokes,
    })),
    soundtrack: {
      version: MUSIC_SCORE_VERSION,
      tempo: soundtrack.tempo,
      steps: soundtrack.steps,
      rows: soundtrack.rows.map((row) => ({
        note: row.note,
        hits: row.hits,
      })),
    },
  })
}

/** Stroke count for one frame (default: first / active-frame index 0). */
export function strokeCount(data: DrawingData, frameIndex = 0): number {
  const frame = data.frames[frameIndex]
  if (!frame) return 0
  return frame.strokes.filter((stroke) => stroke.points.length >= 2).length
}

export function cloneFrame(frame: DrawingFrame): DrawingFrame {
  return {
    strokes: frame.strokes.map((stroke) => ({
      tool: stroke.tool,
      size: stroke.size,
      points: stroke.points.map(([x, y]) => [x, y] as [number, number]),
    })),
  }
}

type PaintStrokesOptions = {
  opacity?: number
  /** Pen stroke color (ignored for erasers). */
  color?: string
  /** When true, skip erasers (onion ghosts). */
  ghost?: boolean
}

/**
 * Paint strokes without clearing.
 * Ghost mode skips erasers and uses opacity/color so overlays do not punch the canvas.
 */
export function paintStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: DrawingStroke[],
  options: PaintStrokesOptions = {}
) {
  const { opacity = 1, color = "#000000", ghost = false } = options
  ctx.save()
  if (opacity < 1) ctx.globalAlpha = opacity
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue
    if (ghost && stroke.tool === DrawingTool.Eraser) continue
    ctx.save()
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.lineWidth = stroke.size
    if (!ghost && stroke.tool === DrawingTool.Eraser) {
      ctx.globalCompositeOperation = "destination-out"
      ctx.strokeStyle = "rgba(0,0,0,1)"
    } else {
      ctx.globalCompositeOperation = "source-over"
      ctx.strokeStyle = color
    }
    ctx.beginPath()
    const [startX, startY] = stroke.points[0]
    ctx.moveTo(startX, startY)
    for (let i = 1; i < stroke.points.length; i++) {
      const [x, y] = stroke.points[i]
      ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.restore()
  }
  ctx.restore()
}

export type RenderDrawingOptions = {
  background?: string
  /** Frame to show (default 0). */
  frameIndex?: number
  /** When set, paint prev/next ghosts under the active frame. */
  onionSkin?: boolean
}

export function renderDrawingToCanvas(
  ctx: CanvasRenderingContext2D,
  data: DrawingData,
  options: RenderDrawingOptions = {}
) {
  const {
    background = "#ffffff",
    frameIndex = 0,
    onionSkin = false,
  } = options
  const index = Math.max(0, Math.min(data.frames.length - 1, frameIndex))
  const active = data.frames[index] ?? emptyFrame()
  const showOnion = onionSkin && data.frames.length > 1
  const { prev, next } = onionNeighborIndexes(data.frames.length, index)

  ctx.clearRect(0, 0, data.width, data.height)
  ctx.fillStyle = background
  ctx.fillRect(0, 0, data.width, data.height)

  // Paint order: previous ghost → next ghost → active on top (ghosts never cover the edit layer).
  if (showOnion) {
    if (prev != null) {
      paintStrokes(ctx, data.frames[prev]?.strokes ?? [], {
        ghost: true,
        opacity: ONION_PREV_OPACITY,
        color: ONION_PREV_COLOR,
      })
    }
    if (next != null) {
      paintStrokes(ctx, data.frames[next]?.strokes ?? [], {
        ghost: true,
        opacity: ONION_NEXT_OPACITY,
        color: ONION_NEXT_COLOR,
      })
    }

    // Offscreen active layer so destination-out erasers do not punch through onion pixels.
    const layer = document.createElement("canvas")
    layer.width = data.width
    layer.height = data.height
    const layerCtx = layer.getContext("2d")
    if (layerCtx) {
      paintStrokes(layerCtx, active.strokes)
      ctx.drawImage(layer, 0, 0)
    } else {
      paintStrokes(ctx, active.strokes)
    }
    return
  }

  paintStrokes(ctx, active.strokes)
}
