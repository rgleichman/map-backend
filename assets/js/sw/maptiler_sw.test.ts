import { describe, expect, it } from "vitest"

// `sw.js` is a classic script for browsers, but we export testable helpers via `module.exports`.
// This repo doesn't include Node typings in TS, so declare `require` locally for this test file.
declare const require: (path: string) => unknown

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sw = require("../../../priv/static/sw.js") as {
  isCacheableMaptilerUrl: (url: string, method?: string) => boolean
  cacheNameForUrl: (url: string) => string
  isFreshFetchedAtMs: (fetchedAtMs: number, nowMs: number) => boolean
  constants: { CACHE_TILES: string; CACHE_FONTS: string; CACHE_SPRITES: string; MAX_AGE_MS: number }
}

describe("MapTiler service worker helpers", () => {
  it("caches only GET requests to api.maptiler.com on hot paths", () => {
    expect(sw.isCacheableMaptilerUrl("https://api.maptiler.com/tiles/v3/1/1/1.pbf?key=x")).toBe(true)
    expect(sw.isCacheableMaptilerUrl("https://api.maptiler.com/fonts/Open%20Sans%20Bold,sans-serif/0-255.pbf?key=x")).toBe(true)
    expect(sw.isCacheableMaptilerUrl("https://api.maptiler.com/maps/streets/sprite@2x.json?key=x")).toBe(true)

    expect(sw.isCacheableMaptilerUrl("https://api.maptiler.com/geocoding/foo.json?key=x")).toBe(false)
    expect(sw.isCacheableMaptilerUrl("https://example.com/tiles/v3/1/1/1.pbf")).toBe(false)
    expect(sw.isCacheableMaptilerUrl("https://api.maptiler.com/tiles/v3/1/1/1.pbf?key=x", "POST")).toBe(false)
  })

  it("routes requests into the expected cache buckets", () => {
    expect(sw.cacheNameForUrl("https://api.maptiler.com/tiles/v3/1/1/1.pbf?key=x")).toBe(sw.constants.CACHE_TILES)
    expect(
      sw.cacheNameForUrl("https://api.maptiler.com/fonts/Open%20Sans%20Bold,sans-serif/0-255.pbf?key=x")
    ).toBe(sw.constants.CACHE_FONTS)
    expect(sw.cacheNameForUrl("https://api.maptiler.com/maps/streets/sprite@2x.png?key=x")).toBe(
      sw.constants.CACHE_SPRITES
    )
  })

  it("treats entries within MAX_AGE_MS as fresh", () => {
    const now = sw.constants.MAX_AGE_MS + 1_000_000
    const within = now - (sw.constants.MAX_AGE_MS - 1)
    const older = now - (sw.constants.MAX_AGE_MS + 1)

    expect(sw.isFreshFetchedAtMs(within, now)).toBe(true)
    expect(sw.isFreshFetchedAtMs(older, now)).toBe(false)
    expect(sw.isFreshFetchedAtMs(0, now)).toBe(false)
  })
})

