import { describe, expect, it } from "vitest"
import {
  drawingHasContent,
  emptyDrawing,
  parseDrawing,
  serializeDrawing,
  strokeCount,
} from "./drawingPayload"

describe("drawingPayload", () => {
  it("parses empty payload", () => {
    expect(parseDrawing("")).toEqual(emptyDrawing())
  })

  it("serializes and parses round-trip", () => {
    const data = {
      ...emptyDrawing(),
      strokes: [{ tool: "pen" as const, size: 2, points: [[1, 2], [3, 4]] as [number, number][] }],
    }
    const parsed = parseDrawing(serializeDrawing(data))
    expect(parsed.strokes).toEqual(data.strokes)
  })

  it("detects content when strokes exist", () => {
    const data = {
      ...emptyDrawing(),
      strokes: [{ tool: "pen" as const, size: 2, points: [[0, 0], [1, 1]] as [number, number][] }],
    }
    expect(drawingHasContent(data)).toBe(true)
    expect(strokeCount(data)).toBe(1)
  })

  it("treats single-point strokes as empty", () => {
    const data = {
      ...emptyDrawing(),
      strokes: [{ tool: "pen" as const, size: 2, points: [[0, 0]] as [number, number][] }],
    }
    expect(drawingHasContent(data)).toBe(false)
    expect(strokeCount(data)).toBe(0)
  })
})
