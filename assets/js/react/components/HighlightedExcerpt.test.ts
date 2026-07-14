import { describe, expect, it } from "vitest"
import { splitSubstringMatch } from "../components/HighlightedExcerpt"

describe("splitSubstringMatch", () => {
  it("splits on first case-insensitive match", () => {
    expect(splitSubstringMatch("Apple Pie", "pie")).toEqual({
      before: "Apple ",
      match: "Pie",
      after: "",
    })
  })

  it("returns null when blank or missing", () => {
    expect(splitSubstringMatch("Apple", "  ")).toBeNull()
    expect(splitSubstringMatch("Apple", "xyz")).toBeNull()
  })
})
