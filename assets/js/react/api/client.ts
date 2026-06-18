import type { ContentReportPayload, CustomPinType, NewPin, Pin, SubMap, UpdatePin } from "../types"

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

export function getPinTypes(): Promise<{ data: CustomPinType[] }> {
  return jsonFetch("/api/pin_types")
}

export function getPins(): Promise<{ data: Pin[] }> {
  return jsonFetch("/api/pins")
}

export function getPin(id: number): Promise<{ data: Pin }> {
  return jsonFetch(`/api/pins/${id}`)
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

export type MusicFieldRef = { ref: string | number }

type MusicFieldUpsertResponse =
  | { data: { value: unknown } }
  | { data: { custom_data_value: unknown } }
  | { data: { custom_data: Record<string, unknown> } }

function pickMusicCustomDataValue(fieldKey: string, res: MusicFieldUpsertResponse): unknown {
  const data = (res as { data: unknown }).data as any
  if (data && typeof data === "object") {
    if ("value" in data) return (data as any).value
    if ("custom_data_value" in data) return (data as any).custom_data_value
    if ("custom_data" in data && data.custom_data && typeof data.custom_data === "object") {
      return (data.custom_data as Record<string, unknown>)[fieldKey]
    }
  }
  return undefined
}

export function upsertMusicField(
  csrf: string | undefined,
  pinId: number,
  fieldKey: string,
  payload: string
): Promise<MusicFieldUpsertResponse> {
  return jsonFetch(`/api/pins/${pinId}/music_fields/${encodeURIComponent(fieldKey)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    body: JSON.stringify({ payload }),
    credentials: "same-origin",
  })
}

export async function deleteMusicField(
  csrf: string | undefined,
  pinId: number,
  fieldKey: string
): Promise<void> {
  await fetchRequest(`/api/pins/${pinId}/music_fields/${encodeURIComponent(fieldKey)}`, {
    method: "DELETE",
    headers: {
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    credentials: "same-origin",
  })
}

export function getMusicField(
  pinId: number,
  fieldKey: string
): Promise<{ data: { payload: string } }> {
  return jsonFetch(`/api/pins/${pinId}/music_fields/${encodeURIComponent(fieldKey)}`)
}

export async function upsertMusicFieldAndGetRef(
  csrf: string | undefined,
  pinId: number,
  fieldKey: string,
  payload: string
): Promise<unknown> {
  const res = await upsertMusicField(csrf, pinId, fieldKey, payload)
  return pickMusicCustomDataValue(fieldKey, res)
}


