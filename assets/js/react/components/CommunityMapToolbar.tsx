import React, { useCallback, useEffect, useId, useRef, useState } from "react"
import type { SubMap } from "../types"
import { actionBtnClass } from "../utils/actionUiClasses"
import Button from "./ui/Button"

type Props = {
  subMap: SubMap
  userId?: number
  onJoin: () => void
  onLeave: () => void
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

const menuItemClass = [
  "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left text-sm",
  "min-h-11 sm:min-h-9 sm:py-2",
  "text-base-content hover:bg-base-200/80 dark:hover:bg-base-300/60",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
  "cursor-pointer border-0 bg-transparent no-underline",
].join(" ")

export default function CommunityMapToolbar({ subMap, userId, onJoin, onLeave }: Props) {
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const pendingCount = subMap.pending_count ?? 0
  const showModeration = Boolean(subMap.can_moderate)
  const showSettings = Boolean(subMap.can_edit)
  const isMember = Boolean(userId && subMap.membership)
  const canJoin = Boolean(userId && !subMap.membership)
  const hasMenuItems = showModeration || showSettings || isMember

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    if (!menuOpen) return

    const onPointerDown = (event: MouseEvent | PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        closeMenu()
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu()
    }

    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [menuOpen, closeMenu])

  const identityLabel = (
    <span className="flex min-w-0 items-center gap-1.5 text-left">
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-base-content/50">
        Community
      </span>
      <span className="truncate text-sm font-semibold leading-none text-base-content">{subMap.name}</span>
    </span>
  )

  return (
    <nav
      aria-label="Community map"
      className="flex flex-shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-base-300 bg-primary/5 px-3 py-1 dark:bg-primary/10"
    >
      <div ref={rootRef} className="relative min-w-0">
        {hasMenuItems ? (
          <>
            <button
              type="button"
              className={actionBtnClass(
                "ghost",
                "sm",
                "min-h-9 max-w-[min(100vw-8rem,22rem)] gap-1.5 border border-base-300/80 bg-base-100/90 px-2 dark:bg-base-200/60",
                menuOpen && "bg-base-200/90 dark:bg-base-300/50",
              )}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {identityLabel}
              {showModeration && pendingCount > 0 && (
                <span className="badge badge-warning badge-sm shrink-0">{pendingCount}</span>
              )}
              <ChevronDownIcon
                className={`shrink-0 text-base-content/60 transition-transform ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {menuOpen && (
              <div
                id={menuId}
                role="menu"
                aria-label={`${subMap.name} actions`}
                className="absolute left-0 z-40 mt-1 min-w-[12rem] rounded-lg border border-base-300 bg-base-100 p-1 shadow-lg dark:bg-base-200"
              >
                {showModeration && (
                  <a
                    role="menuitem"
                    href={`/m/${subMap.community_url}/admin`}
                    className={menuItemClass}
                    onClick={closeMenu}
                  >
                    <span>Moderation</span>
                    {pendingCount > 0 && (
                      <span className="badge badge-warning badge-sm">{pendingCount}</span>
                    )}
                  </a>
                )}
                {showSettings && (
                  <a
                    role="menuitem"
                    href={`/m/${subMap.community_url}/settings`}
                    className={menuItemClass}
                    onClick={closeMenu}
                  >
                    Settings
                  </a>
                )}
                {isMember && (
                  <button
                    type="button"
                    role="menuitem"
                    className={`${menuItemClass} text-error hover:bg-error/10`}
                    onClick={() => {
                      closeMenu()
                      onLeave()
                    }}
                  >
                    Leave
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex max-w-[min(100vw-8rem,22rem)] items-center rounded-md border border-base-300/80 bg-base-100/90 px-2 py-1.5 dark:bg-base-200/60">
            {identityLabel}
          </div>
        )}
      </div>

      {canJoin && (
        <Button variant="primary" size="sm" className="min-h-9" onClick={onJoin}>
          Join
        </Button>
      )}
    </nav>
  )
}
