import type { Pin } from "../../types"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function formatDateTime(iso?: string): string {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
  } catch {
    return iso
  }
}

function isIOSUserAgent(userAgent: string): boolean {
  return /iPhone|iPad|iPod/.test(userAgent)
}

function isAndroidUserAgent(userAgent: string): boolean {
  return /Android/.test(userAgent)
}

export function buildOpenInMapsUrl(userAgent: string, pin: Pin): string {
  if (isIOSUserAgent(userAgent)) {
    return `https://maps.apple.com/place?coordinate=${pin.latitude},${pin.longitude}&name=${encodeURIComponent(pin.title)}`
  }
  if (isAndroidUserAgent(userAgent)) {
    return `geo:${pin.latitude},${pin.longitude}?q=${pin.latitude},${pin.longitude}(${encodeURIComponent(pin.title)})`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pin.latitude},${pin.longitude}`)}`
}

export function buildTagsHtml(tags: string[] | undefined): string {
  if (!tags || tags.length === 0) return ""

  return `<div class="flex flex-wrap" style="margin: 0.5em 0;">
            <span style="font-size:0.95em; color:var(--color-base-content); margin-right:0.5em;">Tags:</span>
            ${tags
      .map(
        (t) =>
          `<button 
                data-tag="${t}" 
                style="background:var(--color-base-200); color:var(--color-base-content); border-radius:4px; padding:0.1em 0.5em; margin-top:0.1em; margin-bottom:0.1em; margin-right:0.3em; font-size:0.95em; border:none; cursor:pointer;"
              >${t}</button>`
      )
      .join("")}
          </div>`
}

export function buildPopupHtml(pin: Pin, userAgent: string): string {
  const tagsHtml = buildTagsHtml(pin.tags)
  const openInMapsUrl = buildOpenInMapsUrl(userAgent, pin)

  return `
          <div>
            <h2 style="font-size: 1.4em; font-weight: bold;">${pin.title}</h2>
            <p>${pin.description || ""}</p>
            ${(pin.start_time || pin.end_time)
      ? `<div style="margin: 0.5em 0;">
              <span style="font-size:0.95em; color:var(--color-base-content);"><b>Start:</b> ${formatDateTime(pin.start_time)}</span><br/>
              <span style="font-size:0.95em; color:var(--color-base-content);"><b>End:</b> ${formatDateTime(pin.end_time)}</span>
            </div>`
      : ""}
            ${pin.schedule_rrule
      ? `<div style="margin: 0.5em 0;">
              <span style="font-size:0.95em; color:var(--color-base-content);"><b>Schedule:</b> ${escapeHtml(pin.schedule_rrule)}</span>
              ${pin.schedule_timezone ? `<br/><span style="font-size:0.95em; color:var(--color-base-content);">(Timezone: ${escapeHtml(pin.schedule_timezone)})</span>` : ""}
            </div>`
      : ""}
            ${tagsHtml}
            <div style="margin-top: 0.5em;">
              <a href="${openInMapsUrl}" target="_blank" rel="noopener noreferrer" style="margin-right: 0.5em; padding: 0.3em 0.6em; background: #3182ce; color: white; border: none; border-radius: 4px; text-decoration: none; display: inline-block;">Get directions</a>
              <button data-pin-action="copy-link" data-pin-id="${pin.id}" style="padding: 0.3em 0.6em; background: var(--color-base-200); color: var(--color-base-content); border: none; border-radius: 4px; cursor: pointer;">Copy link</button>
            </div>
            ${pin.is_owner
      ? `<div style=\"margin-top: 0.5em;\">
              <button data-pin-action=\"edit\" data-pin-id=\"${pin.id}\" style=\"margin-right: 0.5em; padding: 0.3em 0.6em; background: #38a169; color: white; border: none; border-radius: 4px;\">Edit</button>
              <button data-pin-action=\"delete\" data-pin-id=\"${pin.id}\" style=\"padding: 0.3em 0.6em; background: #e53e3e; color: white; border: none; border-radius: 4px;\">Delete</button>
            </div>`
      : ""}
          </div>`
}

