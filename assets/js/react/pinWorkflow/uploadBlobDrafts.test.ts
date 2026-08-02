import { afterEach, describe, expect, it, vi } from "vitest"
import type { Pin } from "../types"
import { BlobFieldType } from "../utils/blobFieldType"
import { uploadBlobDrafts } from "./uploadBlobDrafts"

const upsertSpy = vi.fn()

vi.mock("../api/client", () => ({
  upsertFieldBlobAndGetRef: (...args: unknown[]) => upsertSpy(...args),
}))

vi.mock("../utils/blobPayloadCache", () => ({
  invalidateBlobPayloadCache: vi.fn(),
}))

function pin(overrides: Partial<Pin> = {}): Pin {
  return {
    id: 10,
    title: "Pin",
    latitude: 1,
    longitude: 2,
    pin_type: "one_time",
    pin_type_id: 1,
    status: "approved",
    tags: [],
    custom_data: {},
    ad_hoc_fields: [
      { id: "ad_hoc_song", label: "Jam", type: BlobFieldType.Music },
      { id: "ad_hoc_draw", label: "Sketch", type: BlobFieldType.Drawing },
    ],
    ...overrides,
  }
}

describe("uploadBlobDrafts", () => {
  afterEach(() => {
    upsertSpy.mockReset()
  })

  it("uploads ad-hoc music and drawing drafts and writes refs onto ad_hoc_fields", async () => {
    upsertSpy
      .mockResolvedValueOnce({ ref: 101 })
      .mockResolvedValueOnce({ ref: 202 })

    const result = await uploadBlobDrafts(
      "csrf",
      pin(),
      {},
      {
        ad_hoc_song: { type: BlobFieldType.Music, payload: "tempo=120" },
        ad_hoc_draw: {
          type: BlobFieldType.Drawing,
          payload: JSON.stringify({ version: 1, width: 8, height: 8, strokes: [] }),
        },
      }
    )

    expect(upsertSpy).toHaveBeenCalledTimes(2)
    expect(upsertSpy).toHaveBeenNthCalledWith(
      1,
      "csrf",
      10,
      BlobFieldType.Music,
      "ad_hoc_song",
      "tempo=120"
    )
    expect(upsertSpy).toHaveBeenNthCalledWith(
      2,
      "csrf",
      10,
      BlobFieldType.Drawing,
      "ad_hoc_draw",
      expect.any(String)
    )

    expect(result.ad_hoc_fields).toEqual([
      { id: "ad_hoc_song", label: "Jam", type: BlobFieldType.Music, value: { ref: 101 } },
      { id: "ad_hoc_draw", label: "Sketch", type: BlobFieldType.Drawing, value: { ref: 202 } },
    ])
  })
})
