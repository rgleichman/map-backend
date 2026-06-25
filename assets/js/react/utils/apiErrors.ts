/** Extract a human-readable message from a failed API response body. */
export function parseApiErrorMessage(httpErrorText: string, field?: string): string | null {
  const jsonStart = httpErrorText.indexOf("{")
  if (jsonStart === -1) return null

  try {
    const body = JSON.parse(httpErrorText.slice(jsonStart)) as {
      errors?: Record<string, string[] | string>
      error?: string
    }

    if (field && body.errors?.[field]) {
      const val = body.errors[field]
      if (Array.isArray(val) && val[0]) return val[0]
      if (typeof val === "string") return val
    }

    if (body.errors) {
      for (const messages of Object.values(body.errors)) {
        if (Array.isArray(messages) && messages[0]) return messages[0]
        if (typeof messages === "string") return messages
      }
    }

    if (body.error) return body.error
  } catch {
    return null
  }

  return null
}
