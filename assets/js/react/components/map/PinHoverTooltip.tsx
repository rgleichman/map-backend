import React, { useLayoutEffect, useMemo, useRef, useState } from "react"
import type { Pin } from "../../types"
import { CustomFieldDisplay, PinIdProvider } from "../CustomPinFields"
import PinTypeBadge from "../PinTypeBadge"
import { usePinTypes } from "../../context/PinTypesContext"
import { getPinTypeLabel } from "../../utils/pinTypeIcons"
import { SECTION_LABEL_CLASS } from "../../utils/mapUiClasses"
import { buildPinHoverRows, type PinHoverRow } from "./pinHoverFields"

type Props = {
  pin: Pin
  maxWidth: number
  maxHeight: number
  /** Fires after content is laid out so the host can reveal the popup. */
  onReady?: () => void
}

const FIELD_LABEL_CLASS = `${SECTION_LABEL_CLASS} leading-none`

/** Space reserved so the “more” cue can appear without clipping the last field. */
const MORE_CUE_RESERVE_PX = 22

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className={FIELD_LABEL_CLASS}>{children}</p>
}

function HoverRow({ row, drawingSize }: { row: PinHoverRow; drawingSize: number }) {
  if (row.kind === "music") {
    return (
      <div className="min-w-0">
        <FieldLabel>{row.label}</FieldLabel>
        <span className="mt-1 inline-flex items-center rounded-md bg-base-200/90 dark:bg-base-300/70 px-2 py-0.5 text-[11px] font-medium text-base-content/70">
          Music
        </span>
      </div>
    )
  }

  if (row.kind === "drawing") {
    return (
      <div className="min-w-0">
        <FieldLabel>{row.label}</FieldLabel>
        <div className="mt-1.5 w-fit max-w-full [&_canvas]:shadow-sm">
          <CustomFieldDisplay
            field={row.field}
            value={row.value}
            hoverSkim
            drawingSize={drawingSize}
          />
        </div>
      </div>
    )
  }

  if (row.emphasis === "description") {
    return (
      <p className="text-[13px] leading-relaxed text-base-content/85 line-clamp-3">{row.text}</p>
    )
  }

  return (
    <div className="min-w-0">
      {row.label ? <FieldLabel>{row.label}</FieldLabel> : null}
      <p
        className={[
          "text-xs leading-snug text-base-content/90 line-clamp-2 whitespace-pre-line",
          row.label ? "mt-1" : null,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {row.text}
      </p>
    </div>
  )
}

function MoreCue({ withFade }: { withFade: boolean }) {
  return (
    <div className="relative shrink-0">
      {withFade ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-7 h-7 bg-gradient-to-b from-transparent to-base-100"
        />
      ) : null}
      <p className="relative text-[11px] font-medium leading-none text-base-content/45">
        Click pin for more…
      </p>
    </div>
  )
}

/** Desktop hover tooltip: title, type, and as many fields as fit in the size budget. */
export default function PinHoverTooltip({ pin, maxWidth, maxHeight, onReady }: Props) {
  const { catalog } = usePinTypes()
  const typeLabel = getPinTypeLabel(pin.pin_type, catalog)
  const rows = useMemo(() => buildPinHoverRows(pin, catalog), [pin, catalog])
  const [visibleCount, setVisibleCount] = useState(rows.length)
  const rootRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const rowsKey = rows.map((r) => r.id).join("|")

  const hasMore = visibleCount < rows.length

  // Header + divider + more-cue (when truncated) leave the rest for the body.
  const bodyMaxHeight = Math.max(0, maxHeight - 56 - (hasMore ? MORE_CUE_RESERVE_PX : 0))
  const drawingSize = Math.min(
    140,
    Math.max(80, Math.floor(Math.min(maxWidth - 32, bodyMaxHeight * 0.5))),
  )

  useLayoutEffect(() => {
    setVisibleCount(rows.length)
  }, [pin.id, rowsKey, rows.length])

  useLayoutEffect(() => {
    const body = bodyRef.current
    const root = rootRef.current
    if (!body) {
      // Header-only (or more-cue-only) tooltip still needs a reveal.
      if (!rows.length || visibleCount === 0) onReady?.()
      return
    }

    const overHeight = body.scrollHeight > body.clientHeight + 1
    const overRoot = root != null && root.scrollHeight > maxHeight + 1
    if (visibleCount > 0 && (overHeight || overRoot)) {
      setVisibleCount((count) => Math.max(0, count - 1))
      return
    }

    onReady?.()
  }, [visibleCount, rowsKey, bodyMaxHeight, drawingSize, maxHeight, onReady, rows.length, hasMore])

  const visibleRows = rows.slice(0, visibleCount)

  return (
    <div
      ref={rootRef}
      className="min-w-[11rem] overflow-hidden"
      style={{ maxWidth, maxHeight }}
    >
      <div className="flex items-start gap-2.5">
        <PinTypeBadge pinType={pin.pin_type} catalog={catalog} size="sm" className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[0.9375rem] leading-snug text-base-content truncate">
            {pin.title}
          </p>
          <p className="mt-0.5 text-[11px] font-medium tracking-wide text-base-content/55 truncate">
            {typeLabel}
          </p>
        </div>
      </div>

      {visibleRows.length > 0 || hasMore ? (
        <PinIdProvider pinId={pin.id}>
          <div className="mt-2.5 border-t border-base-300/70 pt-2.5">
            {visibleRows.length > 0 ? (
              <div
                ref={bodyRef}
                className="relative space-y-2.5 overflow-hidden"
                style={{ maxHeight: bodyMaxHeight }}
              >
                {visibleRows.map((row) => (
                  <HoverRow key={row.id} row={row} drawingSize={drawingSize} />
                ))}
              </div>
            ) : null}
            {hasMore ? (
              <div className={visibleRows.length > 0 ? "mt-1.5" : undefined}>
                <MoreCue withFade={visibleRows.length > 0} />
              </div>
            ) : null}
          </div>
        </PinIdProvider>
      ) : null}
    </div>
  )
}
