import React, { type ReactNode } from "react"

type Props = {
  message: string | null
  prefix?: string
}

/** Turn the first "sign in" / "log in" phrase into a login link. */
function messageWithLoginLink(message: string): ReactNode {
  const match = message.match(/\b(sign in|log in)\b/i)
  if (!match || match.index == null) return message

  const start = match.index
  const end = start + match[0].length
  return (
    <>
      {message.slice(0, start)}
      <a href="/users/log-in" className="underline font-semibold hover:opacity-90">
        {match[0]}
      </a>
      {message.slice(end)}
    </>
  )
}

export default function ErrorToast({ message, prefix = "" }: Props) {
  if (!message) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" aria-live="polite">
      <div role="alert" className="absolute top-[10%] bg-error text-error-content px-4 py-2 rounded shadow-lg pointer-events-auto">
        {prefix}
        {messageWithLoginLink(message)}
      </div>
    </div>
  )
}
