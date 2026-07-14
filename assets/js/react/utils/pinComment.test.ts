import { describe, expect, it } from "vitest"
import type { PinComment } from "../types"
import {
  applyCommentDeleted,
  applyCommentUpsert,
  commentCount,
  isCommentAuthor,
  mergeComment,
} from "./pinComment"

function comment(overrides: Partial<PinComment> & Pick<PinComment, "id">): PinComment {
  return {
    pin_id: 1,
    parent_id: null,
    body: "hi",
    deleted: false,
    author: null,
    is_author: false,
    inserted_at: "2026-01-01T12:00:00",
    updated_at: "2026-01-01T12:00:00",
    replies: [],
    ...overrides,
  }
}

describe("isCommentAuthor", () => {
  it("honors preserved is_author even without author id", () => {
    expect(isCommentAuthor(comment({ id: 1, is_author: true }), 9)).toBe(true)
  })

  it("matches author.id to userId", () => {
    expect(isCommentAuthor(comment({ id: 1, author: { id: 9 } }), 9)).toBe(true)
    expect(isCommentAuthor(comment({ id: 1, author: { id: 8 } }), 9)).toBe(false)
  })
})

describe("mergeComment", () => {
  it("preserves is_author and author across broadcast upserts", () => {
    const existing = comment({ id: 1, is_author: true, author: { id: 9 }, body: "a" })
    const incoming = comment({ id: 1, is_author: false, author: null, body: "b" })
    expect(mergeComment(existing, incoming)).toMatchObject({
      body: "b",
      is_author: true,
      author: { id: 9 },
    })
  })
})

describe("applyCommentUpsert", () => {
  it("adds and sorts top-level comments", () => {
    const a = comment({ id: 2, body: "two" })
    const b = comment({ id: 1, body: "one" })
    expect(applyCommentUpsert([a], b).map((c) => c.id)).toEqual([1, 2])
  })

  it("adds a reply under its parent", () => {
    const parent = comment({ id: 1 })
    const reply = comment({ id: 2, parent_id: 1, body: "reply" })
    const next = applyCommentUpsert([parent], reply)
    expect(next[0].replies?.map((r) => r.id)).toEqual([2])
  })
})

describe("applyCommentDeleted", () => {
  it("soft-deletes a top-level comment", () => {
    const [next] = applyCommentDeleted([comment({ id: 1, body: "x" })], 1, null)
    expect(next).toMatchObject({ body: "", deleted: true })
  })

  it("soft-deletes a reply", () => {
    const parent = comment({
      id: 1,
      replies: [comment({ id: 2, parent_id: 1, body: "r" })],
    })
    const [next] = applyCommentDeleted([parent], 2, 1)
    expect(next.replies?.[0]).toMatchObject({ body: "", deleted: true })
  })
})

describe("commentCount", () => {
  it("counts top-level comments and replies", () => {
    expect(
      commentCount([
        comment({ id: 1, replies: [comment({ id: 2, parent_id: 1 })] }),
        comment({ id: 3 }),
      ])
    ).toBe(3)
  })
})
