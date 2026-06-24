import React, { useCallback, useState } from "react"
import * as api from "../../api/client"
import type { ReportCategory as ReportCategoryName } from "../../types"
import { ReportCategory } from "../../utils/reportCategory"

const REPORT_CATEGORY_OPTIONS: { value: ReportCategoryName; label: string }[] = [
  { value: ReportCategory.Inaccurate, label: "Inaccurate information" },
  { value: ReportCategory.AbusiveOrHateful, label: "Abusive or hateful content" },
  { value: ReportCategory.Spam, label: "Spam" },
  { value: ReportCategory.Other, label: "Other" },
]

type Props = {
  pinId: number
  csrfToken?: string
  open: boolean
  onClose: () => void
  onSuccess: (message: string) => void
}

export default function PinReportDialog({ pinId, csrfToken, open, onClose, onSuccess }: Props) {
  const [category, setCategory] = useState<ReportCategoryName>(ReportCategory.Inaccurate)
  const [details, setDetails] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const closeReport = useCallback(() => {
    onClose()
    setFormError(null)
    setSubmitting(false)
    setDetails("")
    setCategory(ReportCategory.Inaccurate)
  }, [onClose])

  const submitReport = useCallback(async () => {
    setFormError(null)
    setSubmitting(true)
    try {
      await api.submitReport(csrfToken, {
        subject_type: "pin",
        subject_id: pinId,
        category,
        ...(details.trim() !== "" ? { details: details.trim() } : {}),
      })
      onSuccess("Thanks — your report was sent.")
      closeReport()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not submit report."
      if (msg.includes("429")) {
        setFormError("Too many requests. Please try again later.")
      } else if (msg.includes("422")) {
        setFormError("Please check the form and try again.")
      } else {
        setFormError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }, [category, closeReport, csrfToken, details, onSuccess, pinId])

  if (!open) return null

  return (
    <div
      id="pin-report-dialog"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-pin-title"
    >
      <div className="bg-base-100 text-base-content border border-base-300 shadow-xl w-full sm:max-w-md sm:rounded-lg rounded-t-lg max-h-[90vh] flex flex-col overscroll-contain">
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2 border-b border-base-300">
          <h3 id="report-pin-title" className="text-lg font-semibold">
            Report this pin
          </h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle"
            onClick={closeReport}
            aria-label="Close report dialog"
          >
            ✕
          </button>
        </div>
        <div id="pin-report-form" className="px-4 py-3 space-y-3 overflow-y-auto text-sm">
          <label className="form-control w-full">
            <span className="label-text font-medium">Reason</span>
            <select
              className="select select-bordered select-sm w-full mt-1"
              value={category}
              onChange={(e) => setCategory(e.target.value as ReportCategoryName)}
            >
              {REPORT_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control w-full">
            <span className="label-text font-medium">Details (optional)</span>
            <textarea
              className="textarea textarea-bordered textarea-sm w-full mt-1 min-h-[5rem]"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={2000}
              placeholder="What is wrong with this pin?"
            />
          </label>
          {formError ? <p className="text-error text-sm">{formError}</p> : null}
        </div>
        <div className="px-4 py-3 border-t border-base-300 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={closeReport}>
            Cancel
          </button>
          <button
            id="pin-report-submit"
            type="button"
            className="btn btn-primary btn-sm"
            disabled={submitting}
            onClick={() => void submitReport()}
          >
            {submitting ? "Sending…" : "Submit report"}
          </button>
        </div>
      </div>
    </div>
  )
}
