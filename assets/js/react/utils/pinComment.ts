import type { PinComment } from "../types"

/** Derive authorship from author id or preserved is_author; broadcasts omit both. */
export function isCommentAuthor(comment: PinComment, userId?: number): boolean {
  if (comment.is_author) return true
  return userId != null && comment.author?.id === userId
}

/** Merge broadcast/HTTP upserts without clobbering a known is_author from list load. */
export function mergeComment(existing: PinComment, incoming: PinComment): PinComment {
  return {
    ...existing,
    body: incoming.body,
    deleted: incoming.deleted,
    inserted_at: incoming.inserted_at,
    updated_at: incoming.updated_at,
    author: incoming.author ?? existing.author,
    is_author: existing.is_author || incoming.is_author,
  }
}

export function commentCount(comments: PinComment[]): number {
  return comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0)
}

function upsertTopLevel(comments: PinComment[], comment: PinComment): PinComment[] {
  const idx = comments.findIndex((c) => c.id === comment.id)
  if (idx >= 0) {
    const next = [...comments]
    next[idx] = { ...mergeComment(comments[idx], comment), replies: comments[idx].replies }
    return next
  }
  return [...comments, { ...comment, replies: comment.replies ?? [] }].sort(
    (a, b) => a.id - b.id
  )
}

function addReply(comments: PinComment[], reply: PinComment): PinComment[] {
  return comments.map((c) => {
    if (c.id !== reply.parent_id) return c
    const replies = c.replies ?? []
    if (replies.some((r) => r.id === reply.id)) {
      return {
        ...c,
        replies: replies.map((r) => (r.id === reply.id ? mergeComment(r, reply) : r)),
      }
    }
    return { ...c, replies: [...replies, reply].sort((a, b) => a.id - b.id) }
  })
}

export function applyCommentUpsert(comments: PinComment[], comment: PinComment): PinComment[] {
  if (comment.parent_id == null) return upsertTopLevel(comments, comment)
  return addReply(comments, comment)
}

export function applyCommentDeleted(
  comments: PinComment[],
  commentId: number,
  parentId: number | null
): PinComment[] {
  if (parentId == null) {
    return comments.map((c) =>
      c.id === commentId ? { ...c, body: "", deleted: true } : c
    )
  }
  return comments.map((c) => ({
    ...c,
    replies: (c.replies ?? []).map((r) =>
      r.id === commentId ? { ...r, body: "", deleted: true } : r
    ),
  }))
}
