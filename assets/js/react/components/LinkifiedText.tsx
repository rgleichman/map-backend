import React from "react"
import { isMailtoHref, parseLinkifiedText } from "../utils/linkify"

type Props = {
  text: string
  className?: string
}

export default function LinkifiedText({ text, className }: Props) {
  const segments = parseLinkifiedText(text)

  return (
    <div className={className}>
      {segments.map((segment, index) => {
        if (segment.kind === "text") {
          return <React.Fragment key={index}>{segment.value}</React.Fragment>
        }

        const mailto = isMailtoHref(segment.href)

        return (
          <a
            key={index}
            href={segment.href}
            {...(mailto ? {} : { target: "_blank", rel: "noopener noreferrer" })}
            className="link link-primary"
          >
            {segment.label}
          </a>
        )
      })}
    </div>
  )
}
