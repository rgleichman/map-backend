import type { PinComment } from "../types"

/** Derive authorship from author id; broadcasts omit correct is_author. */
export function isCommentAuthor(comment: PinComment, userId?: number): boolean {
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
