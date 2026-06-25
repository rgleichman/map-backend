/** Human-readable hint for a text-derived pin link source field. */
export function sourceFieldHint(sourceField?: string | null): string | null {
  if (!sourceField) return null
  if (sourceField === "description") return "via description"
  if (sourceField.startsWith("custom_data.")) {
    return `via ${sourceField.replace("custom_data.", "")}`
  }
  return `via ${sourceField}`
}
