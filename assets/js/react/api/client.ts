import type {
  ContentReportPayload,
  CustomPinType,
  MembershipRole,
  MembershipStatus,
  NewPin,
  Pin,
  PinComment,
  PinLink,
  SubMap,
  UpdatePin,
} from "../types"
import { BLOB_FIELD_API_SEGMENT, BlobFieldType } from "../utils/blobFieldType"

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

export function getPinBacklinks(id: number): Promise<{ data: PinLink[] }> {
  return jsonFetch(`/api/pins/${id}/backlinks`)
}

export function getPinComments(
  pinId: number,
  opts?: { limit?: number; afterId?: number }
): Promise<{ data: PinComment[] }> {
  const params = new URLSearchParams()
  if (opts?.limit != null) params.set("limit", String(opts.limit))
  if (opts?.afterId != null) params.set("after_id", String(opts.afterId))
  const qs = params.toString()
  return jsonFetch(`/api/pins/${pinId}/comments${qs ? `?${qs}` : ""}`)
}

export function createPinComment(
  csrf: string | undefined,
  pinId: number,
  body: string,
  parentId?: number | null
): Promise<{ data: PinComment }> {
  const comment: { body: string; parent_id?: number } = { body }
  if (parentId != null) comment.parent_id = parentId
  return jsonFetch(`/api/pins/${pinId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    body: JSON.stringify({ comment }),
    credentials: "same-origin",
  })
}

export function updatePinComment(
  csrf: string | undefined,
  pinId: number,
  commentId: number,
  body: string
): Promise<{ data: PinComment }> {
  return jsonFetch(`/api/pins/${pinId}/comments/${commentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    body: JSON.stringify({ comment: { body } }),
    credentials: "same-origin",
  })
}

export function deletePinComment(
  csrf: string | undefined,
  pinId: number,
  commentId: number
): Promise<{ data: PinComment }> {
  return jsonFetch(`/api/pins/${pinId}/comments/${commentId}`, {
    method: "DELETE",
    headers: {
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    credentials: "same-origin",
  })
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

export function joinSubMap(
  csrf: string | undefined,
  communityUrl: string
): Promise<{ data: { role: MembershipRole; status: MembershipStatus } }> {
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

export type BlobFieldRef = { ref: string | number }
export type MusicFieldRef = BlobFieldRef

type FieldBlobUpsertResponse =
  | { data: { value: unknown } }
  | { data: { custom_data_value: unknown } }
  | { data: { custom_data: Record<string, unknown> } }

function fieldBlobPath(blobType: BlobFieldType, pinId: number, fieldKey: string) {
  const segment = BLOB_FIELD_API_SEGMENT[blobType]
  return `/api/pins/${pinId}/${segment}/${encodeURIComponent(fieldKey)}`
}

function pickFieldBlobCustomDataValue(fieldKey: string, res: FieldBlobUpsertResponse): unknown {
  const data = (res as { data: unknown }).data as Record<string, unknown> | undefined
  if (data && typeof data === "object") {
    if ("value" in data) return data.value
    if ("custom_data_value" in data) return data.custom_data_value
    if ("custom_data" in data && data.custom_data && typeof data.custom_data === "object") {
      return (data.custom_data as Record<string, unknown>)[fieldKey]
    }
  }
  return undefined
}

export function getFieldBlob(
  pinId: number,
  blobType: BlobFieldType,
  fieldKey: string
): Promise<{ data: { payload: string } }> {
  return jsonFetch(fieldBlobPath(blobType, pinId, fieldKey))
}

export function upsertFieldBlob(
  csrf: string | undefined,
  pinId: number,
  blobType: BlobFieldType,
  fieldKey: string,
  payload: string
): Promise<FieldBlobUpsertResponse> {
  return jsonFetch(fieldBlobPath(blobType, pinId, fieldKey), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    body: JSON.stringify({ payload }),
    credentials: "same-origin",
  })
}

export async function deleteFieldBlob(
  csrf: string | undefined,
  pinId: number,
  blobType: BlobFieldType,
  fieldKey: string
): Promise<void> {
  await fetchRequest(fieldBlobPath(blobType, pinId, fieldKey), {
    method: "DELETE",
    headers: {
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    credentials: "same-origin",
  })
}

export async function upsertFieldBlobAndGetRef(
  csrf: string | undefined,
  pinId: number,
  blobType: BlobFieldType,
  fieldKey: string,
  payload: string
): Promise<unknown> {
  const res = await upsertFieldBlob(csrf, pinId, blobType, fieldKey, payload)
  return pickFieldBlobCustomDataValue(fieldKey, res)
}

export function upsertMusicField(
  csrf: string | undefined,
  pinId: number,
  fieldKey: string,
  payload: string
): Promise<FieldBlobUpsertResponse> {
  return upsertFieldBlob(csrf, pinId, BlobFieldType.Music, fieldKey, payload)
}

export async function deleteMusicField(
  csrf: string | undefined,
  pinId: number,
  fieldKey: string
): Promise<void> {
  return deleteFieldBlob(csrf, pinId, BlobFieldType.Music, fieldKey)
}

export function getMusicField(
  pinId: number,
  fieldKey: string
): Promise<{ data: { payload: string } }> {
  return getFieldBlob(pinId, BlobFieldType.Music, fieldKey)
}

export async function upsertMusicFieldAndGetRef(
  csrf: string | undefined,
  pinId: number,
  fieldKey: string,
  payload: string
): Promise<unknown> {
  return upsertFieldBlobAndGetRef(csrf, pinId, BlobFieldType.Music, fieldKey, payload)
}


