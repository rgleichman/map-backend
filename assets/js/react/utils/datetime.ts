const pad2 = (n: number) => String(n).padStart(2, "0")

// <input type="datetime-local"> expects a LOCAL "YYYY-MM-DDTHH:mm" string.
export function dateToLocalInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function isoToLocalInputValue(s?: string): string {
  return s ? dateToLocalInputValue(new Date(s)) : ""
}

export function localInputValueToISOString(s: string): string | undefined {
  return s ? new Date(s).toISOString() : undefined
}

