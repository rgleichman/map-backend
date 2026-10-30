import { beforeEach, describe, expect, it } from "vitest"
import {
  gardenNavActive,
  isMapPathname,
  LAST_MAP_PATH_KEY,
  mapPathForScope,
  mapPathWithPinQuery,
  parsePinIdFromSearch,
  parseMapPinLink,
  rememberLastMapPath,
  syncMapPinSearch,
} from "./mapRoute"

/** Keep in sync with `test/storymap_web/components/layouts_test.exs` and `test/storymap_web/map_paths_test.exs`. */
describe("isMapPathname", () => {
  it("treats home and map paths as map pages, including trailing slashes", () => {
    expect(isMapPathname("/")).toBe(true)
    expect(isMapPathname("/map")).toBe(true)
    expect(isMapPathname("/map/")).toBe(true)
  })

  it("treats garden map paths as map pages", () => {
    expect(isMapPathname("/g/stories/map")).toBe(true)
    expect(isMapPathname("/g/stories/map/")).toBe(true)
    expect(isMapPathname("/g/stories")).toBe(false)
    expect(isMapPathname("/g")).toBe(false)
  })

  it("treats legacy /m garden map paths as map pages", () => {
    expect(isMapPathname("/m/stories/map")).toBe(true)
    expect(isMapPathname("/m/stories/map/")).toBe(true)
    expect(isMapPathname("/m/stories")).toBe(false)
    expect(isMapPathname("/m")).toBe(false)
  })

  it("rejects other paths", () => {
    expect(isMapPathname("/privacy-policy")).toBe(false)
    expect(isMapPathname("/map/extra")).toBe(false)
    expect(isMapPathname("/about")).toBe(false)
  })
})

describe("gardenNavActive", () => {
  it("is current on garden index and garden pages, not maps", () => {
    expect(gardenNavActive("/g")).toBe(true)
    expect(gardenNavActive("/g/")).toBe(true)
    expect(gardenNavActive("/g/stories")).toBe(true)
    expect(gardenNavActive("/g/stories/settings")).toBe(true)
    expect(gardenNavActive("/g/stories/map")).toBe(false)
    expect(gardenNavActive("/m")).toBe(true)
    expect(gardenNavActive("/m/stories")).toBe(true)
    expect(gardenNavActive("/m/stories/map")).toBe(false)
    expect(gardenNavActive("/")).toBe(false)
    expect(gardenNavActive("/about")).toBe(false)
  })
})

describe("mapPathForScope", () => {
  it("builds canonical /g garden map paths", () => {
    expect(mapPathForScope()).toBe("/map")
    expect(mapPathForScope("stories")).toBe("/g/stories/map")
    expect(mapPathWithPinQuery("stories", 12)).toBe("/g/stories/map?pin=12")
    expect(mapPathWithPinQuery(null, 12)).toBe("/map?pin=12")
  })
})

const ORIGIN = "https://mapgarden.net"

describe("parseMapPinLink", () => {
  it("parses world map pin URLs", () => {
    expect(parseMapPinLink("https://mapgarden.net/map?pin=89", ORIGIN)).toEqual({
      pinId: 89,
      communityUrl: undefined,
    })
    expect(parseMapPinLink("https://mapgarden.net/?pin=42", ORIGIN)).toEqual({
      pinId: 42,
      communityUrl: undefined,
    })
  })

  it("parses garden map pin URLs", () => {
    expect(parseMapPinLink("https://mapgarden.net/g/my-community/map?pin=12", ORIGIN)).toEqual({
      pinId: 12,
      communityUrl: "my-community",
    })
  })

  it("parses legacy /m garden map pin URLs", () => {
    expect(parseMapPinLink("https://mapgarden.net/m/my-community/map?pin=12", ORIGIN)).toEqual({
      pinId: 12,
      communityUrl: "my-community",
    })
  })

  it("returns null for foreign origins", () => {
    expect(parseMapPinLink("https://evil.com/map?pin=89", ORIGIN)).toBeNull()
  })

  it("returns null for non-map paths", () => {
    expect(parseMapPinLink("https://mapgarden.net/pins?pin=89", ORIGIN)).toBeNull()
  })

  it("returns null when pin param is missing or invalid", () => {
    expect(parseMapPinLink("https://mapgarden.net/map", ORIGIN)).toBeNull()
    expect(parseMapPinLink("https://mapgarden.net/map?pin=abc", ORIGIN)).toBeNull()
  })
})

describe("parsePinIdFromSearch", () => {
  it("parses a valid pin id", () => {
    expect(parsePinIdFromSearch("?pin=42")).toBe(42)
  })

  it("returns null when pin is missing or invalid", () => {
    expect(parsePinIdFromSearch("")).toBeNull()
    expect(parsePinIdFromSearch("?pin=abc")).toBeNull()
  })
})

describe("rememberLastMapPath", () => {
  const store: Record<string, string> = {}

  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key]
    const sessionStorageMock = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      clear: () => {
        for (const key of Object.keys(store)) delete store[key]
      },
    }
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: sessionStorageMock,
    })
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        dispatchEvent: () => true,
        location: { pathname: "/", search: "" },
      },
    })
  })

  it("stores map paths and ignores overlay paths", () => {
    rememberLastMapPath("/g/foo/map", "?pin=3")
    expect(store[LAST_MAP_PATH_KEY]).toBe("/g/foo/map?pin=3")

    rememberLastMapPath("/about", "")
    expect(store[LAST_MAP_PATH_KEY]).toBe("/g/foo/map?pin=3")
  })
})

describe("syncMapPinSearch", () => {
  const store: Record<string, string> = {}
  let href = "/"

  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key]
    href = "/g/foo/map"
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value
        },
      },
    })
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        dispatchEvent: () => true,
        location: { pathname: "/g/foo/map", search: "" },
        history: {
          replaceState: (_state: unknown, _title: string, url: string) => {
            href = url
          },
        },
      },
    })
  })

  it("writes pin query and last map path together", () => {
    syncMapPinSearch(12, "/g/foo/map")
    expect(href).toBe("/g/foo/map?pin=12")
    expect(store[LAST_MAP_PATH_KEY]).toBe("/g/foo/map?pin=12")

    syncMapPinSearch(null, "/g/foo/map")
    expect(href).toBe("/g/foo/map")
    expect(store[LAST_MAP_PATH_KEY]).toBe("/g/foo/map")
  })

  it("does not write pin query onto overlay paths", () => {
    syncMapPinSearch(12, "/about")
    expect(href).toBe("/g/foo/map")
    expect(store[LAST_MAP_PATH_KEY]).toBeUndefined()
  })
})
