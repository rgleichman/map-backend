/** Named blob field kinds; values match API routes and `pin_field_blobs.type`. */
export const BlobFieldType = {
  Music: "music",
  Drawing: "drawing",
} as const

export type BlobFieldType = (typeof BlobFieldType)[keyof typeof BlobFieldType]

export const BLOB_FIELD_TYPES: readonly BlobFieldType[] = Object.values(BlobFieldType)

export const BLOB_FIELD_API_SEGMENT: Record<BlobFieldType, string> = {
  [BlobFieldType.Music]: "music_fields",
  [BlobFieldType.Drawing]: "drawing_fields",
}

export function isBlobFieldType(type: string): type is BlobFieldType {
  return (BLOB_FIELD_TYPES as readonly string[]).includes(type)
}
