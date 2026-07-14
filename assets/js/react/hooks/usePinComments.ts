import { useCallback, useEffect, useRef, useState } from "react"
import { getMapChannel } from "../../map_socket"
import * as api from "../api/client"
import type { PinComment } from "../types"
import {
  applyCommentDeleted,
  applyCommentUpsert,
  commentCount,
} from "../utils/pinComment"

type CommentAddedPayload = { pin_id: number; comment: PinComment }
type CommentUpdatedPayload = { pin_id: number; comment: PinComment }
type CommentDeletedPayload = { pin_id: number; comment_id: number; parent_id: number | null }

type Params = {
  pinId: number
  communityUrl?: string
  csrfToken?: string
  enabled?: boolean
}

export function usePinComments({ pinId, communityUrl, csrfToken, enabled = true }: Params) {
  const [comments, setComments] = useState<PinComment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pinIdRef = useRef(pinId)
  pinIdRef.current = pinId

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
    createComment,
    updateComment,
    deleteComment,
  }
}
