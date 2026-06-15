import React from "react"
import { parseMapPinLink } from "../mapRoute"
import { isMailtoHref, parseLinkifiedText } from "../utils/linkify"

type Props = {
  text: string
  className?: string
  onNavigateToPin?: (pinId: number) => void
}

function shouldOpenLinkInNewTab(e: React.MouseEvent<HTMLAnchorElement>): boolean {
  return e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey
}

export default function LinkifiedText({ text, className, onNavigateToPin }: Props) {
  const segments = parseLinkifiedText(text)

  return (
    <div className={className}>
      {segments.map((segment, index) => {
        if (segment.kind === "text") {
          return <React.Fragment key={index}>{segment.value}</React.Fragment>
        }

        const mailto = isMailtoHref(segment.href)
        const mapPinLink = parseMapPinLink(segment.href)
        const inAppPinLink = mapPinLink != null && onNavigateToPin != null

        return (
          <a
            key={index}
            href={segment.href}
            {...(mailto || inAppPinLink ? {} : { target: "_blank", rel: "noopener noreferrer" })}
            className="link link-primary"
            onClick={(e) => {
              if (shouldOpenLinkInNewTab(e)) return
              if (mapPinLink && onNavigateToPin) {
                e.preventDefault()
                onNavigateToPin(mapPinLink.pinId)
              }
            }}
          >
            {segment.label}
          </a>
        )
      })}
    </div>
  )
}
