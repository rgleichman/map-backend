import React from "react"

type Props = {
  message: string | null
  prefix?: string
}

export default function ErrorToast({ message, prefix = "" }: Props) {
  if (!message) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" aria-live="polite">
      <div role="alert" className="absolute top-[10%] bg-error text-error-content px-4 py-2 rounded shadow-lg pointer-events-auto">
        {prefix}
        {message}
      </div>
    </div>
  )
}
