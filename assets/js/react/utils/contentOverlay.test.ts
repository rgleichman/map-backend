import { afterEach, describe, expect, it, vi } from "vitest"
import {
  acquireContentOverlay,
  releaseContentOverlay,
  resetContentOverlayOccupancyForTests,
} from "./contentOverlay"

type ClassList = {
  add: (cls: string) => void
  remove: (cls: string) => void
  contains: (cls: string) => boolean
}

const createClassList = (initial: string[] = []): ClassList => {
  const set = new Set(initial)
  return {
    add: (cls) => {
      set.add(cls)
    },
    remove: (cls) => {
      set.delete(cls)
    },
    contains: (cls) => set.has(cls),
  }
}

const flushMicrotasks = () => Promise.resolve()

const setupDom = (opts: { overlay?: boolean } = {}) => {
  const bodyClass = createClassList()
  const mapClass = createClassList()
  const mapAttrs: Record<string, string> = {}
  let overlay: { present: boolean } | null = opts.overlay === false ? null : { present: true }

  const map = {
    classList: mapClass,
    setAttribute: (key: string, value: string) => {
      mapAttrs[key] = value
    },
    removeAttribute: (key: string) => {
      delete mapAttrs[key]
    },
  }

  const dispatched: string[] = []
  const pageStopListeners: Array<() => void> = []
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      dispatchEvent: (event: Event) => {
        dispatched.push(event.type)
        return true
      },
      addEventListener: (type: string, fn: () => void) => {
        if (type === "phx:page-loading-stop") pageStopListeners.push(fn)
      },
    },
  })
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      body: { classList: bodyClass },
      getElementById: (id: string) => (id === "react-root" ? map : null),
      querySelector: (sel: string) => (sel === "[data-content-overlay]" ? overlay : null),
    },
  })

  return {
    bodyClass,
    mapClass,
    mapAttrs,
    dispatched,
    pageStopListeners,
    setOverlay: (present: boolean) => {
      overlay = present ? { present: true } : null
    },
  }
}

describe("content overlay occupancy", () => {
  afterEach(() => {
    resetContentOverlayOccupancyForTests()
    vi.unstubAllGlobals()
  })

  it("acquire then release with a replacement overlay in the same turn does not close", async () => {
    const dom = setupDom()
    acquireContentOverlay()
    expect(dom.dispatched).toEqual(["map:overlay-open"])
    expect(dom.bodyClass.contains("content-overlay-open")).toBe(true)

    releaseContentOverlay()
    dom.setOverlay(true)
    acquireContentOverlay()
    await flushMicrotasks()

    expect(dom.dispatched).toEqual(["map:overlay-open"])
    expect(dom.bodyClass.contains("content-overlay-open")).toBe(true)
    expect(dom.mapAttrs["aria-hidden"]).toBe("true")
    expect(dom.mapClass.contains("pointer-events-none")).toBe(true)
  })

  it("release with no overlay left closes once after the microtask", async () => {
    const dom = setupDom()

    acquireContentOverlay()
    dom.setOverlay(false)
    releaseContentOverlay()

    expect(dom.bodyClass.contains("content-overlay-open")).toBe(true)
    expect(dom.dispatched).toEqual(["map:overlay-open"])

    await flushMicrotasks()

    expect(dom.dispatched).toEqual(["map:overlay-open", "map:overlay-close"])
    expect(dom.bodyClass.contains("content-overlay-open")).toBe(false)
    expect(dom.mapAttrs["aria-hidden"]).toBeUndefined()
    expect(dom.mapClass.contains("pointer-events-none")).toBe(false)
    expect(dom.pageStopListeners.length).toBe(1)
  })

  it("defers close until the overlay node is gone", async () => {
    const dom = setupDom()

    acquireContentOverlay()
    releaseContentOverlay()
    await flushMicrotasks()

    expect(dom.dispatched).toEqual(["map:overlay-open"])
    expect(dom.bodyClass.contains("content-overlay-open")).toBe(true)

    dom.setOverlay(false)
    dom.pageStopListeners.forEach((fn) => fn())

    expect(dom.dispatched).toEqual(["map:overlay-open", "map:overlay-close"])
    expect(dom.bodyClass.contains("content-overlay-open")).toBe(false)
  })

  it("double acquire is idempotent", () => {
    const dom = setupDom()
    acquireContentOverlay()
    acquireContentOverlay()
    expect(dom.dispatched).toEqual(["map:overlay-open"])
    expect(dom.bodyClass.contains("content-overlay-open")).toBe(true)
  })
})
