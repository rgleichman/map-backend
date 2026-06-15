import React from "react"
import type { SubMap } from "../types"

type Props = {
  subMap: SubMap
  userId?: number
  onJoin: () => void
  onLeave: () => void
  onSelectWorld: () => void
}

export default function CommunityMapToolbar({ subMap, userId, onJoin, onLeave, onSelectWorld }: Props) {
  return (
    <nav
      aria-label="Community map"
      className="flex flex-shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-base-300 bg-base-100/95 px-3 py-1.5 text-sm"
    >
      <span className="max-w-[50vw] truncate font-medium text-base-content sm:max-w-none">
        {subMap.name}
      </span>
      <span className="hidden text-base-content/40 sm:inline" aria-hidden="true">
        ·
      </span>
      <button type="button" onClick={onSelectWorld} className="link link-hover shrink-0 text-xs">
        World map
      </button>
      <a href="/m" className="link link-hover shrink-0 text-xs">
        Communities
      </a>
      {subMap.can_moderate && (
        <a
          href={`/m/${subMap.community_url}/admin`}
          className="link link-hover shrink-0 text-xs"
        >
          Moderation
        </a>
      )}
      {subMap.can_edit && (
        <a
          href={`/m/${subMap.community_url}/settings`}
          className="link link-hover shrink-0 text-xs"
        >
          Settings
        </a>
      )}
      {userId &&
        (subMap.membership ? (
          <button type="button" onClick={onLeave} className="link link-hover shrink-0 text-xs">
            Leave
          </button>
        ) : (
          <button type="button" onClick={onJoin} className="link link-hover shrink-0 text-xs">
            Join
          </button>
        ))}
    </nav>
  )
}
