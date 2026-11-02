import React, { useCallback, useEffect, useState } from "react"
import * as api from "../api/client"
import { useSubMap } from "../context/SubMapContext"
import type { PinCommunity, SubMap } from "../types"
import { gardenRulesText, shouldShowGardenRulesCallout } from "../utils/gardenAbout"
import { GardenCopy } from "../utils/gardenCopy"
import GardenAboutSheet from "./GardenAboutSheet"
import LinkifiedText from "./LinkifiedText"
import Button from "./ui/Button"
import { ChevronDownIcon } from "./ui/icons"

type Props = {
  className?: string
  /** Pin's garden when editing on the world map (context subMap is null). */
  community?: PinCommunity | null
}

export default function GardenRulesCallout({ className, community = null }: Props) {
  const { subMap: contextSubMap } = useSubMap()
  const [fetchedSubMap, setFetchedSubMap] = useState<SubMap | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  useEffect(() => {
    if (contextSubMap != null) {
      setFetchedSubMap(null)
      return
    }
    const url = community?.community_url
    if (!url) {
      setFetchedSubMap(null)
      return
    }

    let cancelled = false
    api
      .getSubMap(url)
      .then(({ data }) => {
        if (!cancelled) setFetchedSubMap(data)
      })
      .catch(() => {
        if (!cancelled) setFetchedSubMap(null)
      })

    return () => {
      cancelled = true
    }
  }, [contextSubMap, community?.community_url])

  const resolvedSubMap = contextSubMap ?? fetchedSubMap
  const gardenName = contextSubMap?.name ?? community?.name ?? fetchedSubMap?.name ?? null
  const rules = gardenRulesText(resolvedSubMap)
  const show = shouldShowGardenRulesCallout(contextSubMap, community)

  const openAbout = useCallback(() => setAboutOpen(true), [])
  const closeAbout = useCallback(() => setAboutOpen(false), [])

  if (!show || gardenName == null) return null

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
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-base-content/50">
            {GardenCopy.garden}
          </span>
          <span className="truncate text-sm font-semibold leading-none text-base-content">
            {gardenName}
          </span>
        </div>
        {rules != null ? (
          <>
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
          </>
        ) : null}
      </div>
      {resolvedSubMap != null ? (
        <GardenAboutSheet open={aboutOpen} subMap={resolvedSubMap} onClose={closeAbout} />
      ) : null}
    </>
  )
}
