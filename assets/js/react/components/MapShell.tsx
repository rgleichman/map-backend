import React from "react"
import { MAP_VIEWPORT_CLASSES } from "../utils/siteLayout"

type Props = {
  /** In-flow chrome above the map (e.g. community toolbar). */
  chrome?: React.ReactNode
  children: React.ReactNode
}

/**
 * Flex column shell for the React map page: optional chrome consumes height;
 * the map viewport fills the remainder. Overlays inside children position
 * relative to the viewport, not the site header.
 */
export default function MapShell({ chrome, children }: Props) {
  return (
    <div className="flex h-full w-full flex-col">
      {chrome}
      <div className={MAP_VIEWPORT_CLASSES}>{children}</div>
    </div>
  )
}
