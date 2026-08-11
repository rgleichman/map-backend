import { afterEach, describe, expect, it, vi } from "vitest"
import { deletePin } from "./client"

describe("deletePin", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("rejects HTML login responses that look like HTTP success", async () => {
    // Mimics: unauthenticated API DELETE without Accept: application/json →
    // server HTML-redirects to /users/log-in → fetch follows to 200 text/html.
    // deletePin must not treat that as a successful delete.
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("<html><body>Log in</body></html>", {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          }),
      ),
    )

    await expect(deletePin("csrf-token", 42)).rejects.toThrow()
  })

  it("resolves on 204 No Content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    )

    await expect(deletePin("csrf-token", 42)).resolves.toBeUndefined()
  })
})
