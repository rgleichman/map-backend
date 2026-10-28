import React, { useEffect, useId, useRef } from "react"
import type { SubMap } from "../types"
import { gardenDescriptionText, gardenRulesText, hasGardenAboutContent } from "../utils/gardenAbout"
import { GardenCopy } from "../utils/gardenCopy"
import LinkifiedText from "./LinkifiedText"
import CloseButton from "./ui/CloseButton"

type Props = {
  open: boolean
  subMap: SubMap
  onClose: () => void
}

export default function GardenAboutSheet({ open, subMap, onClose }: Props) {
  const titleId = useId()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const description = gardenDescriptionText(subMap)
  const rules = gardenRulesText(subMap)

  useEffect(() => {
    if (!open) return
    closeButtonRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [open, onClose])

  if (!open || !hasGardenAboutContent(subMap)) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="bg-base-100 text-base-content border border-base-300 shadow-xl w-full sm:max-w-lg sm:rounded-lg rounded-t-lg max-h-[90vh] flex flex-col overscroll-contain"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-base-300">
          <h2 id={titleId} className="text-xl font-semibold min-w-0">
            {subMap.name}
          </h2>
          <CloseButton
            ref={closeButtonRef}
            aria-label={GardenCopy.closeAboutThisGarden}
            onClick={onClose}
          />
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-4 text-sm sm:text-base">
          {description ? (
            <LinkifiedText
              text={description}
              className="whitespace-pre-wrap text-base-content/80"
            />
          ) : null}
          {rules ? (
            <section id="garden-about-rules" className="space-y-2">
              <h3 className="text-base font-semibold text-base-content">{GardenCopy.gardenRules}</h3>
              <LinkifiedText
                text={rules}
                className="whitespace-pre-wrap text-base-content/80"
              />
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
