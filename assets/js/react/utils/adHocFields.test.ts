import { describe, expect, it } from "vitest"
import type { AdHocField } from "../types"
import {
  AD_HOC_FIELD_ID_PREFIX,
  adHocFieldSchema,
  applyAdHocFieldRef,
  createAdHocField,
  formatAdHocFieldValue,
  isAdHocFieldEmpty,
  newAdHocFieldId,
  pruneEmptyAdHocFields,
  removeAdHocField,
  searchableAdHocFieldText,
  stripAdHocBlobDrafts,
  updateAdHocField,
  validateAdHocFields,
} from "./adHocFields"
import { BlobFieldType } from "./blobFieldType"
import { emptyDrawing, serializeDrawing } from "./drawingPayload"

const field = (overrides: Partial<AdHocField> = {}): AdHocField => ({
  id: "ad_hoc_1",
  label: "Cost",
  type: "text",
  ...overrides,
})

describe("newAdHocFieldId", () => {
  it("generates prefixed unique ids", () => {
    const a = newAdHocFieldId()
    const b = newAdHocFieldId()
    expect(a.startsWith(AD_HOC_FIELD_ID_PREFIX)).toBe(true)
    expect(a).not.toBe(b)
  })
})

describe("createAdHocField", () => {
  it("defaults to an empty text field", () => {
    const created = createAdHocField()
    expect(created.type).toBe("text")
    expect(created.label).toBe("")
    expect(created.value).toBeUndefined()
  })

  it("accepts a blob field type", () => {
    expect(createAdHocField(BlobFieldType.Drawing).type).toBe(BlobFieldType.Drawing)
  })
})

describe("adHocFieldSchema", () => {
  it("maps id to the schema key and carries options", () => {
    const options = [{ value: "a", label: "A" }]
    expect(adHocFieldSchema(field({ type: "select", options }))).toEqual({
      key: "ad_hoc_1",
      label: "Cost",
      type: "select",
      options,
    })
  })
})

describe("isAdHocFieldEmpty", () => {
  it("treats missing, blank, and empty list values as empty", () => {
    expect(isAdHocFieldEmpty(field())).toBe(true)
    expect(isAdHocFieldEmpty(field({ value: "" }))).toBe(true)
    expect(isAdHocFieldEmpty(field({ type: "list", value: [] }))).toBe(true)
  })

  it("treats values and blob refs as present", () => {
    expect(isAdHocFieldEmpty(field({ value: "5" }))).toBe(false)
    expect(
      isAdHocFieldEmpty(field({ type: BlobFieldType.Music, value: { ref: 7 } }))
    ).toBe(false)
  })
})

describe("formatAdHocFieldValue", () => {
  it("formats booleans and lists like schema fields", () => {
    expect(formatAdHocFieldValue(field({ type: "boolean", value: true }))).toBe("Yes")
    expect(formatAdHocFieldValue(field({ type: "list", value: ["a", "b"] }))).toBe("a, b")
  })
})

describe("searchableAdHocFieldText", () => {
  it("returns text for primitives and null for blobs or empties", () => {
    expect(searchableAdHocFieldText(field({ value: "Free entry" }))).toBe("Free entry")
    expect(searchableAdHocFieldText(field())).toBeNull()
    expect(
      searchableAdHocFieldText(field({ type: BlobFieldType.Drawing, value: { ref: 1 } }))
    ).toBeNull()
  })
})

describe("validateAdHocFields", () => {
  it("requires a label when a value is present", () => {
    expect(validateAdHocFields([field({ label: "", value: "5" })])).toBe(
      "Extra fields need a label"
    )
  })

  it("allows unlabeled empty rows", () => {
    expect(validateAdHocFields([field({ label: "" })])).toBeNull()
    expect(validateAdHocFields([field({ value: "5" })])).toBeNull()
  })
})

describe("pruneEmptyAdHocFields", () => {
  it("drops rows with neither label nor value", () => {
    const kept = field({ id: "ad_hoc_2", label: "Notes" })
    expect(pruneEmptyAdHocFields([field({ label: "" }), kept])).toEqual([kept])
  })
})

describe("updateAdHocField / removeAdHocField", () => {
  it("patches and removes by id", () => {
    const fields = [field(), field({ id: "ad_hoc_2", label: "Notes" })]
    expect(updateAdHocField(fields, "ad_hoc_2", { label: "Info" })[1].label).toBe("Info")
    expect(removeAdHocField(fields, "ad_hoc_1")).toHaveLength(1)
  })
})

describe("stripAdHocBlobDrafts", () => {
  it("moves drafts into an upload map keyed by field id", () => {
    const payload = serializeDrawing({
      ...emptyDrawing(),
      frames: [{ strokes: [{ tool: "pen", size: 2, points: [[0, 0], [1, 1]] }] }],
    })
    const fields = [
      field({ id: "ad_hoc_draw", type: BlobFieldType.Drawing, value: { draft: payload } }),
      field({ value: "keep" }),
    ]

    const { cleaned, drafts } = stripAdHocBlobDrafts(fields)

    expect(drafts).toEqual({ ad_hoc_draw: { type: BlobFieldType.Drawing, payload } })
    expect(cleaned[0].value).toBeUndefined()
    expect(cleaned[1].value).toBe("keep")
  })
})

describe("applyAdHocFieldRef", () => {
  it("writes the uploaded ref back into the matching field", () => {
    const fields = [field({ id: "ad_hoc_draw", type: BlobFieldType.Drawing })]
    expect(applyAdHocFieldRef(fields, "ad_hoc_draw", { ref: 12 })[0].value).toEqual({ ref: 12 })
  })
})
