import { describe, expect, it } from "vitest"
import { pickFieldBlobCustomDataValue } from "./client"

describe("pickFieldBlobCustomDataValue", () => {
  it("reads schema blob refs from custom_data", () => {
    expect(
      pickFieldBlobCustomDataValue("song", {
        data: { custom_data: { song: { ref: 7 }, other: "x" } },
      })
    ).toEqual({ ref: 7 })
  })

  it("reads ad-hoc blob refs from ad_hoc_fields by field id", () => {
    expect(
      pickFieldBlobCustomDataValue("ad_hoc_song", {
        data: {
          custom_data: {},
          ad_hoc_fields: [
            { id: "ad_hoc_song", value: { ref: 42 } },
            { id: "other", value: "hi" },
          ],
        },
      })
    ).toEqual({ ref: 42 })
  })

  it("returns undefined when neither custom_data nor ad_hoc_fields have the key", () => {
    expect(
      pickFieldBlobCustomDataValue("missing", {
        data: {
          custom_data: { song: { ref: 1 } },
          ad_hoc_fields: [{ id: "ad_hoc_song", value: { ref: 2 } }],
        },
      })
    ).toBeUndefined()
  })
})
