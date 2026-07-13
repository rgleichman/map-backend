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

function genericApiErrorMessage(status: number): string {
  switch (status) {
    case 401:
      return "Please sign in to continue."
    case 403:
      return "You don't have permission to do that."
    case 404:
      return "Not found."
    case 422:
      return "Please check your input and try again."
    case 429:
      return "Too many requests. Please wait and try again."
    default:
      return "Something went wrong. Please try again."
  }
}

/** User-facing message for a failed fetch; preserves field errors on 422 only. */
export function errorMessageFromResponse(status: number, body: string): string {
  if (status === 422) {
    const fieldError = parseApiErrorMessage(body)
    if (fieldError) return fieldError
  }

  return genericApiErrorMessage(status)
}
