import { afterEach, describe, expect, it, vi } from "vitest"
import { livePatch } from "./liveNav"

const stubWindow = (pathname: string) => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { pathname } },
  })
}

describe("livePatch", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("clicks a phx patch link on map pathnames", () => {
    stubWindow("/g/foo/map")
    const a = {
      href: "",
      style: { display: "" },
      setAttribute: vi.fn(),
      click: vi.fn(),
      remove: vi.fn(),
    }
    const appendChild = vi.fn()
    vi.stubGlobal("document", {
      createElement: vi.fn(() => a),
      body: { appendChild },
    })

    livePatch("/g/bar/map")

    expect(a.setAttribute).toHaveBeenCalledWith("data-phx-link", "patch")
    expect(a.click).toHaveBeenCalledTimes(1)
  })

  it("does not patch from overlay pathnames", () => {
    stubWindow("/saved")
    const createElement = vi.fn()
    vi.stubGlobal("document", {
      createElement,
      body: { appendChild: vi.fn() },
    })

    livePatch("/g/bar/map")

    expect(createElement).not.toHaveBeenCalled()
  })
})
