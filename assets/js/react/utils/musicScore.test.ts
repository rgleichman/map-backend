import { describe, expect, it } from "vitest"
import {
  DEFAULT_NOTES,
  DEFAULT_TEMPO,
  emptyScore,
  parseScore,
  scoreAtStep,
  scoreHasContent,
  serializeScore,
  singleNoteScore,
} from "./musicScore"

describe("musicScore", () => {
  it("returns empty score for blank or non-grid payloads", () => {
    expect(parseScore("")).toEqual(emptyScore())
    expect(parseScore("C4 D4 E4")).toEqual(emptyScore())
    expect(parseScore('{"tempo":90,"notes":["C4","E4"]}')).toEqual(emptyScore())
  })

  it("round-trips v1 grid payloads", () => {
    const score = emptyScore(8, DEFAULT_NOTES, 140)
    score.rows[0].hits[0] = true
    score.rows[2].hits[1] = true
    score.rows[4].hits[3] = true

    const parsed = parseScore(serializeScore(score))
    expect(parsed.tempo).toBe(140)
    expect(parsed.steps).toBe(8)
    expect(parsed.rows[0].hits[0]).toBe(true)
    expect(parsed.rows[2].hits[1]).toBe(true)
    expect(parsed.rows[4].hits[3]).toBe(true)
  })

  it("detects empty vs non-empty scores", () => {
    expect(scoreHasContent(emptyScore())).toBe(false)
    const score = emptyScore()
    score.rows[1].hits[2] = true
    expect(scoreHasContent(score)).toBe(true)
  })

  it("builds single-note and column slice scores", () => {
    const pad = singleNoteScore("G4", 100)
    expect(pad.steps).toBe(1)
    expect(pad.tempo).toBe(100)
    expect(pad.rows).toEqual([{ note: "G4", hits: [true] }])

    const score = emptyScore(4, DEFAULT_NOTES, 120)
    score.rows[0].hits[2] = true
    score.rows[3].hits[2] = true
    const col = scoreAtStep(score, 2)
    expect(col?.steps).toBe(1)
    expect(col?.rows[0].hits).toEqual([true])
    expect(col?.rows[3].hits).toEqual([true])
    expect(col?.rows[1].hits).toEqual([false])
    expect(scoreAtStep(score, 99)).toBeNull()
  })

  it("clamps tempo on parse", () => {
    const score = emptyScore(4, DEFAULT_NOTES, DEFAULT_TEMPO)
    const raw = JSON.parse(serializeScore(score)) as { tempo: number }
    raw.tempo = 999
    expect(parseScore(JSON.stringify(raw)).tempo).toBe(220)
  })
})
