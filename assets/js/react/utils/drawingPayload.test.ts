import { describe, expect, it } from "vitest"
import {
  DEFAULT_DRAWING_FPS,
  MAX_DRAWING_FRAMES,
  drawingHasContent,
  emptyDrawing,
  onionNeighborIndexes,
  parseDrawing,
  serializeDrawing,
  strokeCount,
} from "./drawingPayload"

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
    expect(parsed.fps).toBe(DEFAULT_DRAWING_FPS)
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
      fps: 4,
      frames,
    })
    expect(parseDrawing(payload).frames).toHaveLength(MAX_DRAWING_FRAMES)
  })

  it("clamps fps on parse and serialize", () => {
    const parsed = parseDrawing(
      JSON.stringify({
        version: 2,
        width: 256,
        height: 256,
        fps: 99,
        frames: [{ strokes: [] }],
      })
    )
    expect(parsed.fps).toBe(12)
    const again = parseDrawing(serializeDrawing({ ...parsed, fps: 0 }))
    expect(again.fps).toBe(1)
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
})
