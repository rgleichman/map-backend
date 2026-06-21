import { describe, expect, it } from "vitest"
import { isCustomFieldEmpty } from "./CustomPinFields"
import { BlobFieldType } from "../utils/blobFieldType"
import { serializeDrawing } from "../utils/drawingPayload"
import { serializeScore, emptyScore } from "../utils/musicScore"

const drawingField = { key: "sketch", label: "Sketch", type: BlobFieldType.Drawing }
const musicField = { key: "tune", label: "Tune", type: BlobFieldType.Music }

describe("isCustomFieldEmpty", () => {
  it("treats drawing drafts with strokes as non-empty when field type is known", () => {
    const draft = {
      draft: serializeDrawing({
        version: 1,
        width: 256,
        height: 256,
        strokes: [{ tool: "pen", size: 2, points: [[0, 0], [1, 1]] }],
      }),
    }
    expect(isCustomFieldEmpty(draft, drawingField)).toBe(false)
  })

  it("auto-detects drawing drafts without field type", () => {
    const draft = {
      draft: serializeDrawing({
        version: 1,
        width: 256,
        height: 256,
        strokes: [{ tool: "pen", size: 2, points: [[0, 0], [1, 1]] }],
      }),
    }
    expect(isCustomFieldEmpty(draft)).toBe(false)
  })

  it("treats music drafts with content as non-empty", () => {
    const score = emptyScore()
    score.rows[0].hits[0] = true
    const draft = { draft: serializeScore(score) }
    expect(isCustomFieldEmpty(draft, musicField)).toBe(false)
  })

  it("treats empty blob drafts as empty", () => {
    expect(isCustomFieldEmpty({ draft: "" }, drawingField)).toBe(true)
    expect(isCustomFieldEmpty({ draft: "   " }, musicField)).toBe(true)
  })

  it("treats blob refs as non-empty", () => {
    expect(isCustomFieldEmpty({ ref: 42 }, drawingField)).toBe(false)
  })
})
