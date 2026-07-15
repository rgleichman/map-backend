import { describe, expect, it } from "vitest"
import {
  MAX_DRAWING_FRAMES,
  drawingHasContent,
  emptyDrawing,
  insertSoundtrackColumn,
  onionNeighborIndexes,
  parseDrawing,
  removeSoundtrackColumn,
  resizeSoundtrack,
  serializeDrawing,
  strokeCount,
} from "./drawingPayload"
import { DEFAULT_TEMPO, emptyScore } from "./musicScore"

describe("drawingPayload", () => {
  it("parses empty payload", () => {
    expect(parseDrawing("")).toEqual(emptyDrawing())
  })

  it("serializes and parses round-trip as v2 frames", () => {
    const data = {
      ...emptyDrawing(),
      frames: [
        { strokes: [{ tool: "pen" as const, size: 2, points: [[1, 2], [3, 4]] as [number, number][] }] },
      ],
    }
    const parsed = parseDrawing(serializeDrawing(data))
    expect(parsed.version).toBe(2)
    expect(parsed.frames).toEqual(data.frames)
    expect(parsed.soundtrack.tempo).toBe(DEFAULT_TEMPO)
  })

  it("normalizes legacy v1 strokes into a single frame", () => {
    const legacy = JSON.stringify({
      version: 1,
      width: 256,
      height: 256,
      strokes: [{ tool: "pen", size: 2, points: [[0, 0], [1, 1]] }],
    })
    const parsed = parseDrawing(legacy)
    expect(parsed.version).toBe(2)
    expect(parsed.frames).toHaveLength(1)
    expect(parsed.frames[0].strokes).toEqual([
      { tool: "pen", size: 2, points: [[0, 0], [1, 1]] },
    ])
  })

  it("caps frames at MAX_DRAWING_FRAMES", () => {
    const frames = Array.from({ length: MAX_DRAWING_FRAMES + 3 }, () => ({
      strokes: [{ tool: "pen" as const, size: 2, points: [[0, 0], [1, 1]] as [number, number][] }],
    }))
    const payload = JSON.stringify({
      version: 2,
      width: 256,
      height: 256,
      frames,
    })
    expect(parseDrawing(payload).frames).toHaveLength(MAX_DRAWING_FRAMES)
  })

  it("ignores legacy fps field on parse", () => {
    const parsed = parseDrawing(
      JSON.stringify({
        version: 2,
        width: 256,
        height: 256,
        fps: 8,
        frames: [{ strokes: [] }, { strokes: [] }],
        soundtrack: emptyScore(2),
      })
    )
    expect(parsed.soundtrack.tempo).toBe(DEFAULT_TEMPO)
    expect(parsed).not.toHaveProperty("fps")
  })

  it("detects content when any frame has strokes", () => {
    const data = {
      ...emptyDrawing(),
      frames: [
        { strokes: [] },
        { strokes: [{ tool: "pen" as const, size: 2, points: [[0, 0], [1, 1]] as [number, number][] }] },
      ],
    }
    expect(drawingHasContent(data)).toBe(true)
    expect(strokeCount(data, 0)).toBe(0)
    expect(strokeCount(data, 1)).toBe(1)
  })

  it("treats single-point strokes as empty", () => {
    const data = {
      ...emptyDrawing(),
      frames: [{ strokes: [{ tool: "pen" as const, size: 2, points: [[0, 0]] as [number, number][] }] }],
    }
    expect(drawingHasContent(data)).toBe(false)
    expect(strokeCount(data)).toBe(0)
  })

  it("rejects invalid versions", () => {
    expect(parseDrawing(JSON.stringify({ version: 3, frames: [] }))).toEqual(emptyDrawing())
    expect(parseDrawing(JSON.stringify({ version: 2, strokes: [] }))).toEqual(emptyDrawing())
  })

  it("resolves onion neighbor indexes for first, middle, last, and single frame", () => {
    expect(onionNeighborIndexes(1, 0)).toEqual({ prev: null, next: null })
    expect(onionNeighborIndexes(3, 0)).toEqual({ prev: null, next: 1 })
    expect(onionNeighborIndexes(3, 1)).toEqual({ prev: 0, next: 2 })
    expect(onionNeighborIndexes(3, 2)).toEqual({ prev: 1, next: null })
    expect(onionNeighborIndexes(3, -1)).toEqual({ prev: null, next: 1 })
    expect(onionNeighborIndexes(3, 99)).toEqual({ prev: 1, next: null })
  })

  it("round-trips soundtrack aligned to frames", () => {
    const soundtrack = emptyScore(2)
    soundtrack.rows[0].hits[0] = true
    soundtrack.rows[2].hits[1] = true
    const data = {
      ...emptyDrawing(),
      frames: [emptyDrawing().frames[0], emptyDrawing().frames[0]],
      soundtrack,
    }
    const parsed = parseDrawing(serializeDrawing(data))
    expect(parsed.soundtrack.steps).toBe(2)
    expect(parsed.soundtrack.rows[0].hits[0]).toBe(true)
    expect(parsed.soundtrack.rows[2].hits[1]).toBe(true)
  })

  it("synthesizes empty soundtrack when missing on parse", () => {
    const payload = JSON.stringify({
      version: 2,
      width: 256,
      height: 256,
      frames: [{ strokes: [] }, { strokes: [] }, { strokes: [] }],
    })
    const parsed = parseDrawing(payload)
    expect(parsed.soundtrack.steps).toBe(3)
    expect(parsed.soundtrack.rows.every((row) => row.hits.every((h) => !h))).toBe(true)
  })

  it("resizes soundtrack columns to match frame count", () => {
    const score = emptyScore(2)
    score.rows[0].hits[0] = true
    score.rows[0].hits[1] = true
    const grown = resizeSoundtrack(score, 4)
    expect(grown.steps).toBe(4)
    expect(grown.rows[0].hits).toEqual([true, true, false, false])
    const shrunk = resizeSoundtrack(score, 1)
    expect(shrunk.steps).toBe(1)
    expect(shrunk.rows[0].hits).toEqual([true])
  })

  it("inserts and removes soundtrack columns", () => {
    const score = emptyScore(2)
    score.rows[0].hits[0] = true
    score.rows[0].hits[1] = true
    const inserted = insertSoundtrackColumn(score, 1)
    expect(inserted.steps).toBe(3)
    expect(inserted.rows[0].hits).toEqual([true, false, true])
    const removed = removeSoundtrackColumn(inserted, 1)
    expect(removed.steps).toBe(2)
    expect(removed.rows[0].hits).toEqual([true, true])
    expect(removeSoundtrackColumn(emptyScore(1), 0).steps).toBe(1)
  })
})
