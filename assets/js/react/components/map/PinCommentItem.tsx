import React, { useState } from "react"
import type { PinComment } from "../../types"
import { isCommentAuthor } from "../../utils/pinComment"
import { formatCommentTimestamp } from "../../utils/popupFormatters"
import { ReportSubjectType } from "../../utils/reportSubjectType"
import LinkifiedText from "../LinkifiedText"
import CommentComposer from "./CommentComposer"
import ContentReportDialog from "./ContentReportDialog"

type Props = {
  comment: PinComment
  depth?: number
  userId?: number
  userMuted?: boolean
  csrfToken?: string
  onNavigateToPin?: (pinId: number) => void
  onReply: (parentId: number, body: string) => Promise<void>
  onUpdate: (commentId: number, body: string) => Promise<void>
  onDelete: (commentId: number, parentId: number | null) => Promise<void>
  onLoginRequired: () => void
}

function authorLabel(comment: PinComment, userId?: number): string {
  return isCommentAuthor(comment, userId) ? "You" : "Member"
}

export default function PinCommentItem({
  comment,
  depth = 0,
  userId,
  userMuted = false,
  csrfToken,
  onNavigateToPin,
  onReply,
  onUpdate,
  onDelete,
  onLoginRequired,
}: Props) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyBody, setReplyBody] = useState("")
  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState(comment.body)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportSuccess, setReportSuccess] = useState<string | null>(null)

  const isAuthor = isCommentAuthor(comment, userId)
  const canInteract = Boolean(userId) && !userMuted && !comment.deleted
  const canReply = canInteract && depth === 0
  const canEdit = canInteract && isAuthor
  const canDelete = canInteract && isAuthor

  const runAction = async (fn: () => Promise<void>) => {
    setActionError(null)
    setSubmitting(true)
    try {
      await fn()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setSubmitting(false)
    }
  }

  const submitReply = () => {
    const body = replyBody.trim()
    if (!body) return
    if (!userId) {
      onLoginRequired()
      return
    }
    void runAction(async () => {
      await onReply(comment.id, body)
      setReplyBody("")
      setReplyOpen(false)
    })
  }

  const submitEdit = () => {
    const body = editBody.trim()
    if (!body) return
    void runAction(async () => {
      await onUpdate(comment.id, body)
      setEditing(false)
    })
  }

  return (
    <div className={depth > 0 ? "ml-4 mt-2 border-l-2 border-base-300 pl-3" : "mt-3"}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-sm font-semibold text-base-content">{authorLabel(comment, userId)}</span>
        <time className="text-xs text-base-content/60" dateTime={comment.inserted_at}>
          {formatCommentTimestamp(comment.inserted_at)}
        </time>
      </div>

      {comment.deleted ? (
        <p className="mt-1 text-sm italic text-base-content/50">[deleted]</p>
      ) : editing ? (
        <CommentComposer
          className="mt-1 space-y-2"
          value={editBody}
          onChange={setEditBody}
          onSubmit={submitEdit}
          submitLabel="Save"
          disabled={submitting}
          onCancel={() => {
            setEditing(false)
            setEditBody(comment.body)
          }}
        />
      ) : (
        <LinkifiedText
          className="mt-1 text-sm text-base-content/90 whitespace-pre-wrap break-words"
          text={comment.body}
          onNavigateToPin={onNavigateToPin}
        />
      )}

      {!comment.deleted && !editing ? (
        <div className="mt-1 flex flex-wrap gap-2">
          {canReply ? (
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline bg-transparent border-none cursor-pointer p-0"
              onClick={() => {
                if (!userId) {
                  onLoginRequired()
                  return
                }
                setReplyOpen((v) => !v)
              }}
            >
              Reply
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              className="text-xs font-medium text-base-content/70 hover:underline bg-transparent border-none cursor-pointer p-0"
              onClick={() => {
                setEditBody(comment.body)
                setEditing(true)
              }}
            >
              Edit
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              className="text-xs font-medium text-error hover:underline bg-transparent border-none cursor-pointer p-0"
              onClick={() => {
                if (!window.confirm("Delete this comment?")) return
                void runAction(() => onDelete(comment.id, comment.parent_id))
              }}
              disabled={submitting}
            >
              Delete
            </button>
          ) : null}
          <button
            type="button"
            className="text-xs font-medium text-base-content/70 hover:underline bg-transparent border-none cursor-pointer p-0"
            onClick={() => setReportOpen(true)}
          >
            Report
          </button>
        </div>
      ) : null}

      <ContentReportDialog
        subjectType={ReportSubjectType.PinComment}
        subjectId={comment.id}
        title="Report this comment"
        detailsPlaceholder="What is wrong with this comment?"
        csrfToken={csrfToken}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSuccess={(message) => setReportSuccess(message)}
      />

      {reportSuccess ? <p className="mt-1 text-xs text-success">{reportSuccess}</p> : null}

      {replyOpen ? (
        <CommentComposer
          className="mt-2 space-y-2"
          value={replyBody}
          onChange={setReplyBody}
          onSubmit={submitReply}
          submitLabel="Reply"
          placeholder="Write a reply…"
          disabled={submitting}
          onCancel={() => {
            setReplyOpen(false)
            setReplyBody("")
          }}
        />
      ) : null}

      {actionError ? <p className="mt-1 text-xs text-error">{actionError}</p> : null}

      {comment.replies?.map((reply) => (
        <PinCommentItem
          key={reply.id}
          comment={reply}
          depth={1}
          userId={userId}
          userMuted={userMuted}
          csrfToken={csrfToken}
          onNavigateToPin={onNavigateToPin}
          onReply={onReply}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onLoginRequired={onLoginRequired}
        />
      ))}
    </div>
  )
}
