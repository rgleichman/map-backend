import React, { useEffect, useMemo, useState } from "react"
import { getPinBacklinks } from "../../api/client"
import type { Pin, PinLink } from "../../types"
import LinkifiedText from "../LinkifiedText"
import PinLinkChips from "../PinLinkChips"
import { CustomFieldDisplay, PinIdProvider } from "../CustomPinFields"
import { isCustomFieldEmpty } from "../../utils/customFieldValue"
import { usePinTypes } from "../../context/PinTypesContext"
import { findCustomPinType, isCustomPinType, schemaFields } from "../../utils/customPinTypes"
import { communityUrlFromTag, pinMapUrl } from "../../utils/pinMapUrl"
import { buildOpenInMapsUrl, formatDateTime, rruleToHumanReadable } from "../../utils/popupFormatters"
import PinReportDialog from "./PinReportDialog"
import PinComments from "./PinComments"
import PinHeartButton from "./PinHeartButton"
import type { ToggleHeartResult } from "../../types"
import Button from "../ui/Button"
import CloseButton from "../ui/CloseButton"
import { PencilIcon, TrashIcon } from "../ui/icons"

const detailContentClasses = "text-sm text-base-content"

type Props = {
  pin: Pin
  pins: Pin[]
  csrfToken?: string
  userId?: number
  userMuted?: boolean
  /** Current community map slug, if any (undefined = world map). */
  communityUrl?: string
  onSelectCommunity?: (communityUrl: string) => void
  onNavigateToPin?: (pinId: number) => void
  onTagFilter?: (tag: string) => void
  onEdit?: (pinId: number) => void
  onDelete?: (pinId: number) => void
  onClose?: () => void
  hearted?: boolean
  onToggleHeart?: () => Promise<ToggleHeartResult>
}

export default function PinDetailView({
  pin,
  pins,
  csrfToken,
  userId,
  userMuted,
  communityUrl,
  onSelectCommunity,
  onNavigateToPin,
  onTagFilter,
  onEdit,
  onDelete,
  onClose,
  hearted = false,
  onToggleHeart,
}: Props) {
  const { catalog } = usePinTypes()
  const customType = isCustomPinType(pin.pin_type) ? findCustomPinType(pin.pin_type, catalog) : undefined
  const customFields = schemaFields(customType)
  const customFieldsWithValues = useMemo(
    () =>
      customFields.filter((field) => !isCustomFieldEmpty(pin.custom_data?.[field.key], field)),
    [customFields, pin.custom_data]
  )
  const [reportOpen, setReportOpen] = useState(false)
  const [doneMessage, setDoneMessage] = useState<string | null>(null)
  const [backlinks, setBacklinks] = useState<PinLink[] | null>(null)
  const [copyLabel, setCopyLabel] = useState("Copy link")

  useEffect(() => {
    let cancelled = false
    setBacklinks(null)

    getPinBacklinks(pin.id)
      .then(({ data }) => {
        if (!cancelled) setBacklinks(data)
      })
      .catch(() => {
        if (!cancelled) setBacklinks([])
      })

    return () => {
      cancelled = true
    }
  }, [pin.id])

  const relatedLinks = pin.linked_pins ?? []

  const displayTags = useMemo(
    () =>
      pin.tags.filter((tag) => {
        if (!pin.community) return true
        return communityUrlFromTag(tag) !== pin.community.community_url
      }),
    [pin.community, pin.tags]
  )

  const showCommunityLink =
    pin.community != null && pin.community.community_url !== communityUrl

  const openInMapsUrl = buildOpenInMapsUrl(
    typeof navigator !== "undefined" ? navigator.userAgent : "",
    pin
  )

  const handleCopyLink = () => {
    const url = pinMapUrl(pin)
    void navigator.clipboard.writeText(url).then(() => {
      setCopyLabel("Copied!")
      window.setTimeout(() => setCopyLabel("Copy link"), 1500)
    })
  }

  const handleTagClick = (tag: string) => {
    const communityFromTag = communityUrlFromTag(tag)
    if (communityFromTag) {
      onSelectCommunity?.(communityFromTag)
      return
    }
    onTagFilter?.(tag)
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-xl font-bold flex-1 min-w-0">{pin.title}</h2>
        {onClose ? (
          <CloseButton aria-label="Close pin details" onClick={onClose} className="shrink-0" />
        ) : null}
      </div>
      {pin.description ? (
        <LinkifiedText className="mt-1" text={pin.description} onNavigateToPin={onNavigateToPin} />
      ) : null}
      {customFieldsWithValues.length > 0 ? (
        <PinIdProvider pinId={pin.id}>
          <dl className={`${detailContentClasses} my-2 space-y-2`}>
            {customFieldsWithValues.map((field) => (
              <div key={field.key}>
                <dt className="font-semibold">{field.label}</dt>
                <dd className="mt-0.5 text-base-content/90">
                  <CustomFieldDisplay field={field} value={pin.custom_data?.[field.key]} />
                </dd>
              </div>
            ))}
          </dl>
        </PinIdProvider>
      ) : null}
      {(pin.start_time || pin.end_time) && (
        <div className={`${detailContentClasses} my-2`}>
          <span>
            <b>Start:</b> {formatDateTime(pin.start_time)}
          </span>
          <br />
          <span>
            <b>End:</b> {formatDateTime(pin.end_time)}
          </span>
        </div>
      )}
      {pin.schedule_rrule && (
        <div className={`${detailContentClasses} my-2`}>
          <span>
            <b>Schedule:</b> {rruleToHumanReadable(pin.schedule_rrule)}
          </span>
        </div>
      )}
      {pin.schedule_timezone && (
        <div className={`${detailContentClasses} my-2`}>
          <span>Timezone: {pin.schedule_timezone}</span>
        </div>
      )}
      {showCommunityLink && pin.community ? (
        <div className="my-2">
          <button
            type="button"
            onClick={() => onSelectCommunity?.(pin.community!.community_url)}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[0.95em] font-medium no-underline bg-primary/15 text-base-content hover:bg-primary/25 border-none cursor-pointer"
          >
            {pin.community.name}
          </button>
        </div>
      ) : null}
      {displayTags.length > 0 && (
        <div className="flex flex-wrap gap-x-1 gap-y-1 items-center my-2">
          <span className={detailContentClasses}>Tags:</span>
          {displayTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleTagClick(tag)}
              className="rounded px-2 py-0.5 text-[0.95em] border-none cursor-pointer bg-base-200 text-base-content hover:opacity-90"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      {relatedLinks.length > 0 ? (
        <div className="my-2">
          <p className={`${detailContentClasses} font-semibold mb-1`}>Related pins</p>
          <PinLinkChips links={relatedLinks} pins={pins} onNavigate={onNavigateToPin} />
        </div>
      ) : null}
      {backlinks && backlinks.length > 0 ? (
        <div className="my-2">
          <p className={`${detailContentClasses} font-semibold mb-1`}>Linked from</p>
          <PinLinkChips links={backlinks} pins={pins} onNavigate={onNavigateToPin} showSourceHint={false} />
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2 items-center">
        <Button
          href={openInMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="primary"
          size="sm"
          className="no-underline"
        >
          Get directions
        </Button>
        <Button type="button" onClick={handleCopyLink} variant="ghost" size="sm">
          {copyLabel}
        </Button>
        {onToggleHeart && (
          <PinHeartButton
            hearted={hearted}
            disabled={userMuted}
            onToggle={onToggleHeart}
          />
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setDoneMessage(null)
            setReportOpen(true)
          }}
        >
          Report pin
        </Button>
      </div>
      {doneMessage ? <p className="mt-2 text-sm text-success">{doneMessage}</p> : null}
      {pin.is_owner && (
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            onClick={() => onEdit?.(pin.id)}
            variant="primary"
            size="sm"
            className="inline-flex items-center gap-1.5"
          >
            <PencilIcon className="size-4" />
            Edit
          </Button>
          <Button
            type="button"
            onClick={() => onDelete?.(pin.id)}
            variant="danger"
            size="sm"
            className="inline-flex items-center gap-1.5"
          >
            <TrashIcon className="size-4" />
            Delete
          </Button>
        </div>
      )}

      <PinReportDialog
        pinId={pin.id}
        csrfToken={csrfToken}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSuccess={setDoneMessage}
      />

      <PinComments
        pinId={pin.id}
        communityUrl={communityUrl}
        userId={userId}
        userMuted={userMuted}
        csrfToken={csrfToken}
        onNavigateToPin={onNavigateToPin}
      />
    </div>
  )
}
