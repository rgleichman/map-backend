import React, { useState } from "react"
import { usePinComments } from "../../hooks/usePinComments"
import PinCommentItem from "./PinCommentItem"
import LoginRequiredModal from "../LoginRequiredModal"

type Props = {
  pinId: number
  communityUrl?: string
  userId?: number
  userMuted?: boolean
  csrfToken?: string
  onNavigateToPin?: (pinId: number) => void
}

export default function PinComments({
  pinId,
  communityUrl,
  userId,
  userMuted = false,
  csrfToken,
  onNavigateToPin,
}: Props) {
  const [open, setOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [newBody, setNewBody] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    comments,
    commentCount,
    loading,
    error,
    createComment,
    updateComment,
    deleteComment,
  } = usePinComments({ pinId, communityUrl, csrfToken, enabled: true })

  const submitNew = async () => {
    const body = newBody.trim()
    if (!body) return
    if (!userId) {
      setLoginOpen(true)
      return
    }
    if (userMuted) {
      setFormError("Your account cannot post comments.")
      return
    }
    setFormError(null)
    setSubmitting(true)
    try {
      await createComment(body)
      setNewBody("")
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not post comment.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReply = async (parentId: number, body: string) => {
    await createComment(body, parentId)
  }

  return (
    <div className="mt-3 border-t border-base-300 pt-2">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded px-1 py-1.5 text-left text-sm font-semibold text-base-content hover:bg-base-200/80 border-none cursor-pointer bg-transparent"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>Comments{commentCount > 0 ? ` (${commentCount})` : ""}</span>
        <span className="text-base-content/60" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open ? (
        <div className="mt-2">
          {loading ? (
            <p className="text-sm text-base-content/60">Loading comments…</p>
          ) : error ? (
            <p className="text-sm text-error">{error}</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-base-content/60">No comments yet.</p>
          ) : (
            <div>
              {comments.map((comment) => (
                <PinCommentItem
                  key={comment.id}
                  comment={comment}
                  userId={userId}
                  userMuted={userMuted}
                  csrfToken={csrfToken}
                  onNavigateToPin={onNavigateToPin}
                  onReply={handleReply}
                  onUpdate={(id, body) => updateComment(id, body).then(() => undefined)}
                  onDelete={(id, parentId) => deleteComment(id, parentId)}
                  onLoginRequired={() => setLoginOpen(true)}
                />
              ))}
            </div>
          )}

          <div className="mt-3 space-y-2">
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder={userId ? "Add a comment…" : "Log in to comment…"}
              rows={2}
              className="w-full rounded border border-base-300 bg-base-100 px-2 py-1.5 text-sm"
              disabled={submitting || userMuted}
              onFocus={() => {
                if (!userId) setLoginOpen(true)
              }}
            />
            <button
              type="button"
              className="rounded px-3 py-1.5 text-sm font-semibold bg-primary text-primary-content disabled:opacity-50"
              onClick={() => void submitNew()}
              disabled={submitting || newBody.trim() === "" || userMuted}
            >
              Post comment
            </button>
            {userMuted ? (
              <p className="text-xs text-base-content/60">Your account cannot post comments.</p>
            ) : null}
            {formError ? <p className="text-xs text-error">{formError}</p> : null}
          </div>
        </div>
      ) : null}

      {loginOpen ? (
        <LoginRequiredModal
          message="You must be logged in to comment on pins."
          onClose={() => setLoginOpen(false)}
        />
      ) : null}
    </div>
  )
}
