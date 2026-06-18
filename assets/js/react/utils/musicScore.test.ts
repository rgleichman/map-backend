import { describe, expect, it } from "vitest"
import {
  DEFAULT_NOTES,
  DEFAULT_STEPS,
  DEFAULT_TEMPO,
  emptyScore,
  parseScore,
  scoreHasContent,
  scoreToNoteList,
  serializeScore,
} from "./musicScore"

describe("musicScore", () => {
  it("parses plain note text into sequential steps", () => {
    const score = parseScore("C4 D4 E4 G4")
    expect(score.tempo).toBe(DEFAULT_TEMPO)
    expect(score.steps).toBe(DEFAULT_STEPS)
    expect(scoreToNoteList(score)).toEqual(["C4", "D4", "E4", "G4"])
  })

  it("parses legacy JSON notes format", () => {
    const score = parseScore('{"tempo":90,"notes":["C4","E4","G4"]}')
    expect(score.tempo).toBe(90)
    expect(scoreToNoteList(score)).toEqual(["C4", "E4", "G4"])
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
    expect(scoreToNoteList(parsed)).toEqual(["C4", "E4", "G4"])
  })

  it("detects empty vs non-empty scores", () => {
    expect(scoreHasContent(emptyScore())).toBe(false)
    const score = emptyScore()
    score.rows[1].hits[2] = true
    expect(scoreHasContent(score)).toBe(true)
  })
})
