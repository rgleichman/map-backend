import { useCallback, useEffect, useRef, useState } from "react"
import { getMapChannel } from "../../map_socket"
import * as api from "../api/client"
import type { PinComment } from "../types"

type CommentAddedPayload = { pin_id: number; comment: PinComment }
type CommentUpdatedPayload = { pin_id: number; comment: PinComment }
type CommentDeletedPayload = { pin_id: number; comment_id: number; parent_id: number | null }

type Params = {
  pinId: number
  communityUrl?: string
  csrfToken?: string
  enabled?: boolean
}

function commentCount(comments: PinComment[]): number {
  return comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0)
}

function upsertTopLevel(comments: PinComment[], comment: PinComment): PinComment[] {
  const idx = comments.findIndex((c) => c.id === comment.id)
  if (idx >= 0) {
    const next = [...comments]
    next[idx] = { ...comments[idx], ...comment, replies: comments[idx].replies }
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
        replies: replies.map((r) => (r.id === reply.id ? { ...r, ...reply } : r)),
      }
    }
    return { ...c, replies: [...replies, reply].sort((a, b) => a.id - b.id) }
  })
}

function applyCommentUpsert(comments: PinComment[], comment: PinComment): PinComment[] {
  if (comment.parent_id == null) return upsertTopLevel(comments, comment)
  return addReply(comments, comment)
}

function applyCommentDeleted(
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

export function usePinComments({ pinId, communityUrl, csrfToken, enabled = true }: Params) {
  const [comments, setComments] = useState<PinComment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pinIdRef = useRef(pinId)
  pinIdRef.current = pinId

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.getPinComments(pinId)
      setComments(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load comments.")
      setComments([])
    } finally {
      setLoading(false)
    }
  }, [pinId])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setComments([])
    setLoading(true)
    setError(null)

    api
      .getPinComments(pinId)
      .then(({ data }) => {
        if (!cancelled) setComments(data)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load comments.")
          setComments([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [pinId, enabled])

  useEffect(() => {
    if (!enabled) return
    const channel = getMapChannel(communityUrl)

    const onAdded = (payload: CommentAddedPayload) => {
      if (payload.pin_id !== pinIdRef.current) return
      setComments((prev) => applyCommentUpsert(prev, payload.comment))
    }

    const onUpdated = (payload: CommentUpdatedPayload) => {
      if (payload.pin_id !== pinIdRef.current) return
      setComments((prev) => applyCommentUpsert(prev, payload.comment))
    }

    const onDeleted = (payload: CommentDeletedPayload) => {
      if (payload.pin_id !== pinIdRef.current) return
      setComments((prev) =>
        applyCommentDeleted(prev, payload.comment_id, payload.parent_id)
      )
    }

    channel.on("comment_added", onAdded)
    channel.on("comment_updated", onUpdated)
    channel.on("comment_deleted", onDeleted)

    return () => {
      channel.off("comment_added", onAdded)
      channel.off("comment_updated", onUpdated)
      channel.off("comment_deleted", onDeleted)
    }
  }, [communityUrl, enabled])

  const createComment = useCallback(
    async (body: string, parentId?: number | null) => {
      const { data } = await api.createPinComment(csrfToken, pinId, body, parentId)
      setComments((prev) => applyCommentUpsert(prev, data))
      return data
    },
    [csrfToken, pinId]
  )

  const updateComment = useCallback(
    async (commentId: number, body: string) => {
      const { data } = await api.updatePinComment(csrfToken, pinId, commentId, body)
      setComments((prev) => applyCommentUpsert(prev, data))
      return data
    },
    [csrfToken, pinId]
  )

  const deleteComment = useCallback(
    async (commentId: number, parentId: number | null) => {
      await api.deletePinComment(csrfToken, pinId, commentId)
      setComments((prev) => applyCommentDeleted(prev, commentId, parentId))
    },
    [csrfToken, pinId]
  )

  return {
    comments,
    commentCount: commentCount(comments),
    loading,
    error,
    refresh,
    createComment,
    updateComment,
    deleteComment,
  }
}
