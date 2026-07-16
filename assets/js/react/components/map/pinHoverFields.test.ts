import { describe, expect, it } from "vitest"
import type { CustomPinType, Pin } from "../../types"
import { BlobFieldType } from "../../utils/blobFieldType"
import { buildPinHoverRows, hoverPopupMaxSize } from "./pinHoverFields"

function basePin(overrides: Partial<Pin> = {}): Pin {
  return {
    id: 1,
    title: "Cafe",
    latitude: 0,
    longitude: 0,
    pin_type: "one_time",
    status: "approved",
    tags: [],
    ...overrides,
  }
}

const catalog: CustomPinType[] = [
  {
    id: 10,
    slug: "spot",
    label: "Spot",
    schema: {
      fields: [
        { key: "notes", label: "Notes", type: "text" },
        { key: "sketch", label: "Sketch", type: BlobFieldType.Drawing },
        { key: "tune", label: "Tune", type: BlobFieldType.Music },
        { key: "emptyish", label: "Empty", type: "text" },
      ],
    },
    pin_type: "custom:spot",
    enabled: true,
  },
]

describe("hoverPopupMaxSize", () => {
  it("uses one-third of the map when larger than the floor", () => {
    expect(hoverPopupMaxSize(900, 600)).toEqual({ maxWidth: 300, maxHeight: 200 })
  })

  it("applies a floor for small maps", () => {
    expect(hoverPopupMaxSize(300, 240)).toEqual({ maxWidth: 160, maxHeight: 160 })
  })
})

describe("buildPinHoverRows", () => {
  it("orders description, custom fields, times, then schedule", () => {
    const pin = basePin({
      pin_type: "custom:spot",
      description: "A nice place",
      custom_data: {
        notes: "Bring cash",
        sketch: { ref: 1 },
        tune: { ref: 2 },
        emptyish: "",
      },
      start_time: "2024-06-01T15:00:00Z",
      end_time: "2024-06-01T17:00:00Z",
      schedule_rrule: "FREQ=WEEKLY;BYDAY=MO",
    })

    const rows = buildPinHoverRows(pin, catalog)
    expect(rows.map((r) => r.id)).toEqual([
      "description",
      "field:notes",
      "field:sketch",
      "field:tune",
      "times",
      "schedule",
    ])
    expect(rows[0]).toMatchObject({ kind: "text", emphasis: "description", text: "A nice place" })
    expect(rows[1]).toMatchObject({ kind: "text", label: "Notes", text: "Bring cash" })
    expect(rows[2]).toMatchObject({ kind: "drawing", label: "Sketch" })
    expect(rows[3]).toMatchObject({ kind: "music", label: "Tune" })
    expect(rows[4]).toMatchObject({ kind: "text", label: "When" })
    expect(rows[5]).toMatchObject({ kind: "text", label: "Schedule" })
  })

  it("labels a start-only time as Starts", () => {
    const rows = buildPinHoverRows(
      basePin({ start_time: "2024-06-01T15:00:00Z" }),
      catalog,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: "times", label: "Starts" })
  })

  it("skips empty custom fields and empty description", () => {
    const pin = basePin({
      pin_type: "custom:spot",
      description: "   ",
      custom_data: { notes: "", sketch: { ref: 1 } },
    })
    const rows = buildPinHoverRows(pin, catalog)
    expect(rows.map((r) => r.id)).toEqual(["field:sketch"])
  })

  it("returns no custom rows for builtin pins without extras", () => {
    expect(buildPinHoverRows(basePin(), catalog)).toEqual([])
  })
})
