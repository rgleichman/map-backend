import type { ContentReportPayload, NewPin, Pin, SubMap, UpdatePin } from "../types"

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

async function fetchRequest(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  return res
}

export function getPins(): Promise<{ data: Pin[] }> {
  return jsonFetch("/api/pins")
}

export function getSubMap(communityUrl: string): Promise<{ data: SubMap }> {
  return jsonFetch(`/api/sub_maps/${encodeURIComponent(communityUrl)}`)
}

export function getSubMapPins(communityUrl: string): Promise<{ data: Pin[] }> {
  return jsonFetch(`/api/sub_maps/${encodeURIComponent(communityUrl)}/pins`)
}

export function joinSubMap(csrf: string | undefined, communityUrl: string): Promise<{ data: { role: string; status: string } }> {
  return jsonFetch(`/api/sub_maps/${encodeURIComponent(communityUrl)}/memberships`, {
    method: "POST",
    headers: {
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    credentials: "same-origin",
  })
}

export async function leaveSubMap(csrf: string | undefined, communityUrl: string): Promise<void> {
  await fetchRequest(`/api/sub_maps/${encodeURIComponent(communityUrl)}/memberships/me`, {
    method: "DELETE",
    headers: {
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    credentials: "same-origin",
  })
}

export function createSubMapPin(
  csrf: string | undefined,
  communityUrl: string,
  pin: NewPin
): Promise<{ data: Pin }> {
  return jsonFetch(`/api/sub_maps/${encodeURIComponent(communityUrl)}/pins`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    body: JSON.stringify({ pin }),
    credentials: "same-origin",
  })
}

export function createPin(csrf: string | undefined, pin: NewPin): Promise<{ data: Pin }> {
  return jsonFetch("/api/pins", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    body: JSON.stringify({ pin }),
    credentials: "same-origin",
  })
}

export function updatePin(csrf: string | undefined, id: number, changes: UpdatePin): Promise<{ data: Pin }> {
  return jsonFetch(`/api/pins/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    body: JSON.stringify({ pin: changes }),
    credentials: "same-origin",
  })
}

export async function deletePin(csrf: string | undefined, id: number): Promise<void> {
  await fetchRequest(`/api/pins/${id}`, {
    method: "DELETE",
    headers: {
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    credentials: "same-origin",
  })
}

export function submitReport(
  csrf: string | undefined,
  payload: ContentReportPayload
): Promise<{ data: Record<string, unknown> }> {
  const report = {
    subject_type: payload.subject_type,
    subject_id: payload.subject_id,
    category: payload.category,
    ...(payload.details != null && payload.details !== ""
      ? { details: payload.details }
      : {}),
  }
  return jsonFetch("/api/reports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    body: JSON.stringify({ report }),
    credentials: "same-origin",
  })
}


