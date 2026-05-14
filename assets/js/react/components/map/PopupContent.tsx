import React, { useCallback, useState } from "react"
import { RRule } from "rrule"
import * as api from "../../api/client"
import type { Pin, ReportCategory } from "../../types"

const SENTINEL_DATE_PREFIX = "2000-01-01T"

const REPORT_CATEGORY_OPTIONS: { value: ReportCategory; label: string }[] = [
  { value: "inaccurate", label: "Inaccurate information" },
  { value: "abusive_or_hateful", label: "Abusive or hateful content" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
]

function rruleToHumanReadable(rruleStr: string): string {
  try {
    return RRule.fromString(rruleStr).toText()
  } catch {
    return rruleStr
  }
}

function formatDateTime(iso?: string): string {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    const timeStr = d.toLocaleString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })
    if (iso.startsWith(SENTINEL_DATE_PREFIX)) return timeStr
    const dateStr = d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" })
    return `${dateStr}, ${timeStr}`
  } catch {
    return iso
  }
}

function buildOpenInMapsUrl(userAgent: string, pin: Pin): string {
  if (/iPhone|iPad|iPod/.test(userAgent)) {
    return `https://maps.apple.com/place?coordinate=${pin.latitude},${pin.longitude}&name=${encodeURIComponent(pin.title)}`
  }
  if (/Android/.test(userAgent)) {
    return `geo:${pin.latitude},${pin.longitude}?q=${pin.latitude},${pin.longitude}(${encodeURIComponent(pin.title)})`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pin.latitude},${pin.longitude}`)}`
}

const popupContentClasses = "text-sm text-base-content"

type Props = {
  pin: Pin
  csrfToken?: string
}

export default function PopupContent({ pin, csrfToken }: Props) {
  const [reportOpen, setReportOpen] = useState(false)
  const [category, setCategory] = useState<ReportCategory>("inaccurate")
  const [details, setDetails] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [doneMessage, setDoneMessage] = useState<string | null>(null)

  const openInMapsUrl = buildOpenInMapsUrl(
    typeof navigator !== "undefined" ? navigator.userAgent : "",
    pin
  )

  const closeReport = useCallback(() => {
    setReportOpen(false)
    setFormError(null)
    setSubmitting(false)
    setDetails("")
    setCategory("inaccurate")
  }, [])

  const submitReport = useCallback(async () => {
    setFormError(null)
    setSubmitting(true)
    try {
      await api.submitReport(csrfToken, {
        subject_type: "pin",
        subject_id: pin.id,
        category,
        ...(details.trim() !== "" ? { details: details.trim() } : {}),
      })
      setDoneMessage("Thanks — your report was sent.")
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
  }, [category, closeReport, csrfToken, details, pin.id])

  return (
    <div>
      <h2 className="text-xl font-bold">{pin.title}</h2>
      {pin.description ? <p className="mt-1">{pin.description}</p> : null}
      {(pin.start_time || pin.end_time) && (
        <div className={`${popupContentClasses} my-2`}>
          <span>
            <b>Start:</b> {formatDateTime(pin.start_time)}
          </span>
          <br />
          <span>
            <b>End:</b> {formatDateTime(pin.end_time)}
          </span>
        </div>
      )}
      {pin.schedule_rrule && (
        <div className={`${popupContentClasses} my-2`}>
          <span>
            <b>Schedule:</b> {rruleToHumanReadable(pin.schedule_rrule)}
          </span>
        </div>
      )}
      {pin.schedule_timezone && (
        <div className={`${popupContentClasses} my-2`}>
          <span>Timezone: {pin.schedule_timezone}</span>
        </div>
      )}
      {pin.tags && pin.tags.length > 0 && (
        <div className="flex flex-wrap gap-x-1 gap-y-1 items-center my-2">
          <span className={popupContentClasses}>Tags:</span>
          {pin.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              data-tag={tag}
              className="rounded px-2 py-0.5 text-[0.95em] border-none cursor-pointer bg-base-200 text-base-content hover:opacity-90"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-2 items-center">
        <a
          href={openInMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded px-2 py-1.5 font-semibold text-white no-underline bg-blue-700 hover:bg-blue-800"
        >
          Get directions
        </a>
        <button
          type="button"
          data-pin-action="copy-link"
          data-pin-id={pin.id}
          className="rounded px-2 py-1.5 border-none cursor-pointer font-semibold bg-base-200 text-base-content hover:opacity-90"
        >
          Copy link
        </button>
        <button
          type="button"
          className="rounded px-2 py-1.5 border-none cursor-pointer font-semibold bg-base-300 text-base-content hover:opacity-90"
          onClick={() => {
            setDoneMessage(null)
            setReportOpen(true)
          }}
        >
          Report pin
        </button>
      </div>
      {doneMessage ? <p className="mt-2 text-sm text-success">{doneMessage}</p> : null}
      {pin.is_owner && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            data-pin-action="edit"
            data-pin-id={pin.id}
            className="rounded px-2 py-1.5 border-none cursor-pointer font-semibold text-white bg-emerald-700 hover:bg-emerald-800"
          >
            Edit
          </button>
          <button
            type="button"
            data-pin-action="delete"
            data-pin-id={pin.id}
            className="rounded px-2 py-1.5 border-none cursor-pointer font-semibold text-white bg-red-700 hover:bg-red-800"
          >
            Delete
          </button>
        </div>
      )}

      {reportOpen ? (
        <div
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
            <div className="px-4 py-3 space-y-3 overflow-y-auto text-sm">
              <label className="form-control w-full">
                <span className="label-text font-medium">Reason</span>
                <select
                  className="select select-bordered select-sm w-full mt-1"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ReportCategory)}
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
      ) : null}
    </div>
  )
}
