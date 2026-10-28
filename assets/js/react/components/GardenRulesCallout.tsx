import React, { useCallback, useState } from "react"
import { useSubMap } from "../context/SubMapContext"
import { gardenRulesText, shouldShowGardenRulesCallout } from "../utils/gardenAbout"
import { GardenCopy } from "../utils/gardenCopy"
import GardenAboutSheet from "./GardenAboutSheet"
import LinkifiedText from "./LinkifiedText"
import Button from "./ui/Button"
import { ChevronDownIcon } from "./ui/icons"

type Props = {
  className?: string
}

export default function GardenRulesCallout({ className }: Props) {
  const { subMap } = useSubMap()
  const [expanded, setExpanded] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const rules = gardenRulesText(subMap)
  const show = shouldShowGardenRulesCallout(subMap)

  const openAbout = useCallback(() => setAboutOpen(true), [])
  const closeAbout = useCallback(() => setAboutOpen(false), [])

  if (!show || !subMap || rules == null) return null

  return (
    <>
      <div
        id="garden-rules-callout"
        className={[
          "rounded-lg border border-base-300 bg-base-200/50 p-3 space-y-2",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-base-content">{GardenCopy.gardenRules}</p>
          <button
            type="button"
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-base-content/70 hover:bg-base-200 dark:hover:bg-base-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-expanded={expanded}
            aria-controls="garden-rules-callout-body"
            onClick={() => setExpanded((open) => !open)}
          >
            <span className="sr-only">
              {expanded ? GardenCopy.hideGardenRules : GardenCopy.showGardenRules}
            </span>
            <ChevronDownIcon
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
              size={16}
            />
          </button>
        </div>
        <div id="garden-rules-callout-body">
          <LinkifiedText
            text={rules}
            className={[
              "text-sm text-base-content/80 whitespace-pre-wrap",
              expanded ? "" : "line-clamp-2",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={openAbout}>
          {GardenCopy.readAllRules}
        </Button>
      </div>
      <GardenAboutSheet open={aboutOpen} subMap={subMap} onClose={closeAbout} />
    </>
  )
}
