import { describe, expect, it } from "vitest"
import { validateCustomFields } from "../utils/customFieldValue"
import { BlobFieldType } from "../utils/blobFieldType"
import { serializeScore, emptyScore } from "../utils/musicScore"

const drawingField = { key: "sketch", label: "Sketch", type: BlobFieldType.Drawing }
const musicField = { key: "tune", label: "Tune", type: BlobFieldType.Music }

describe("validateCustomFields", () => {
  it("rejects required blob fields with empty drafts", () => {
    expect(
      validateCustomFields([{ ...drawingField, required: true }], { sketch: { draft: "" } })
    ).toBe("Sketch is required")
    expect(
      validateCustomFields([{ ...musicField, required: true }], { tune: { draft: "   " } })
    ).toBe("Tune is required")
  })

  it("accepts required blob fields with refs or contentful drafts", () => {
    const fields = [
      { ...drawingField, required: true },
      { ...musicField, required: true },
    ]
    const score = emptyScore()
    score.rows[0].hits[0] = true
    expect(
      validateCustomFields(fields, {
        sketch: { ref: 1 },
        tune: { draft: serializeScore(score) },
      })
    ).toBeNull()
  })
})
