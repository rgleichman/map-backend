import React from "react"
import type { Pin } from "../../types"

const SENTINEL_DATE_PREFIX = "2000-01-01T"

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
}

export default function PopupContent({ pin }: Props) {
  const openInMapsUrl = buildOpenInMapsUrl(
    typeof navigator !== "undefined" ? navigator.userAgent : "",
    pin
  )

  return (
    <div>
      <h2 className="text-xl font-bold">{pin.title}</h2>
      {pin.description ? <p className="mt-1">{pin.description}</p> : null}
      {(pin.start_time || pin.end_time) && (
        <div className={popupContentClasses} style={{ margin: "0.5em 0" }}>
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
        <div className={popupContentClasses} style={{ margin: "0.5em 0" }}>
          <span>
            <b>Schedule:</b> {pin.schedule_rrule}
          </span>
        </div>
      )}
      {pin.schedule_timezone && (
        <div className={popupContentClasses} style={{ margin: "0.5em 0" }}>
          <span>Timezone: {pin.schedule_timezone}</span>
        </div>
      )}
      {pin.tags && pin.tags.length > 0 && (
        <div className="flex flex-wrap gap-x-1 gap-y-1 items-center" style={{ margin: "0.5em 0" }}>
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
          className="inline-block rounded px-2 py-1.5 text-white no-underline bg-[#3182ce] hover:opacity-90"
        >
          Get directions
        </a>
        <button
          type="button"
          data-pin-action="copy-link"
          data-pin-id={pin.id}
          className="rounded px-2 py-1.5 border-none cursor-pointer bg-base-200 text-base-content hover:opacity-90"
        >
          Copy link
        </button>
      </div>
      {pin.is_owner && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            data-pin-action="edit"
            data-pin-id={pin.id}
            className="rounded px-2 py-1.5 border-none cursor-pointer text-white bg-[#38a169] hover:opacity-90"
          >
            Edit
          </button>
          <button
            type="button"
            data-pin-action="delete"
            data-pin-id={pin.id}
            className="rounded px-2 py-1.5 border-none cursor-pointer text-white bg-[#e53e3e] hover:opacity-90"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
