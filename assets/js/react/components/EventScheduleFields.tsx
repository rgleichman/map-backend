import React, { useCallback, useEffect, useId, useMemo, useRef } from "react"
import {
  COMBOBOX_LIST_CLASS,
  comboboxActiveDescendant,
  comboboxOptionClassName,
  comboboxOptionId,
  useComboboxNavigation,
} from "../hooks/useComboboxNavigation"
import {
  applyEndDate,
  applyEndTimeOfDay,
  applyExpandToMultiDay,
  applySingleDate,
  applyStartDate,
  applyStartTimeOfDay,
  dayTimeSlots,
  DIFFERENT_DAY_LABEL,
  endTimeListScrolledToBottom,
  endTimeSlotsAfter,
  formatTimeSlotLabel,
  isSameCalendarDay,
  splitLocalDateTime,
} from "../utils/eventSchedule"

type Props = {
  startTime: string
  endTime: string
  setStartTime: (t: string) => void
  setEndTime: (t: string) => void
}

const INPUT_CLASS = "input input-bordered w-full"
const LABEL_CLASS = "block font-medium mb-1"
const DAY_TIME_SLOTS = dayTimeSlots()

export default function EventScheduleFields({
  startTime,
  endTime,
  setStartTime,
  setEndTime,
}: Props) {
  const start = splitLocalDateTime(startTime)
  const end = splitLocalDateTime(endTime)
  const sameDay = isSameCalendarDay(startTime, endTime)

  const emit = useCallback(
    (next: { startTime: string; endTime: string }) => {
      if (next.startTime !== startTime) setStartTime(next.startTime)
      if (next.endTime !== endTime) setEndTime(next.endTime)
    },
    [startTime, endTime, setStartTime, setEndTime]
  )

  const startTimeValue = start?.time ?? ""
  const endTimeValue = end?.time ?? ""
  const startDateValue = start?.date ?? ""
  const endDateValue = end?.date ?? ""

  const onSelectStartTime = useCallback(
    (time: string) => emit(applyStartTimeOfDay(startTime, endTime, time)),
    [emit, startTime, endTime]
  )

  if (sameDay) {
    return (
      <div className="mb-4">
        <label htmlFor="pin-event-date" className={LABEL_CLASS}>
          Date
        </label>
        <input
          id="pin-event-date"
          name="event_date"
          type="date"
          value={startDateValue}
          onChange={(e) => emit(applySingleDate(startTime, endTime, e.target.value))}
          className={`${INPUT_CLASS} mb-2`}
        />
        <div className="grid grid-cols-2 gap-2">
          <TimeSlotList
            id="pin-start-time"
            name="start_time"
            label="Start time"
            value={startTimeValue}
            slots={DAY_TIME_SLOTS}
            onSelectTime={onSelectStartTime}
          />
          <EndTimeList
            startTime={startTime}
            endTimeValue={endTimeValue}
            onSelectTime={(time) => setEndTime(applyEndTimeOfDay(startTime, endTime, time))}
            onExpandMultiDay={() => emit(applyExpandToMultiDay(startTime))}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label htmlFor="pin-start-date" className={LABEL_CLASS}>
            Start date
          </label>
          <input
            id="pin-start-date"
            name="start_date"
            type="date"
            value={startDateValue}
            onChange={(e) => emit(applyStartDate(startTime, endTime, e.target.value))}
            className={INPUT_CLASS}
          />
        </div>
        <TimeSlotList
          id="pin-start-time"
          name="start_time"
          label="Start time"
          value={startTimeValue}
          slots={DAY_TIME_SLOTS}
          onSelectTime={onSelectStartTime}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label htmlFor="pin-end-date" className={LABEL_CLASS}>
            End date
          </label>
          <input
            id="pin-end-date"
            name="end_date"
            type="date"
            min={startDateValue || undefined}
            value={endDateValue}
            onChange={(e) => emit(applyEndDate(startTime, endTime, e.target.value))}
            className={INPUT_CLASS}
          />
        </div>
        <TimeSlotList
          id="pin-end-time"
          name="end_time"
          label="End time"
          value={endTimeValue}
          slots={DAY_TIME_SLOTS}
          onSelectTime={(time) => setEndTime(applyEndTimeOfDay(startTime, endTime, time))}
        />
      </div>
    </div>
  )
}

type TimeSlotListProps = {
  id: string
  name: string
  label: string
  value: string
  slots: string[]
  onSelectTime: (time: string) => void
  footerLabel?: string
  onSelectFooter?: () => void
  onScrollToBottom?: () => void
}

function TimeSlotList({
  id,
  name,
  label,
  value,
  slots,
  onSelectTime,
  footerLabel,
  onSelectFooter,
  onScrollToBottom,
}: TimeSlotListProps) {
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const allowScrollExpandRef = useRef(false)
  const {
    highlightIndex,
    focused,
    close,
    handleFocus,
    handleBlur,
    handleListKeyDown,
  } = useComboboxNavigation(inputRef)

  const optionCount = slots.length + (footerLabel && onSelectFooter ? 1 : 0)
  const showList = focused
  const selectedSlotIndex = slots.indexOf(value)
  const displayValue = value ? formatTimeSlotLabel(value) : ""

  useEffect(() => {
    if (!showList || selectedSlotIndex < 0 || !listRef.current) return
    // Prefer children index over `#id` querySelector: React useId() values
    // include `:` which is not a valid unescaped CSS selector.
    const option = listRef.current.children[selectedSlotIndex]
    if (option instanceof HTMLElement) {
      option.scrollIntoView({ block: "nearest" })
    }
  }, [showList, selectedSlotIndex])

  const selectIndex = useCallback(
    (index: number) => {
      if (index < 0) return
      if (index >= slots.length) {
        onSelectFooter?.()
        close()
        return
      }
      const slot = slots[index]
      if (!slot) return
      onSelectTime(slot)
      close()
    },
    [slots, onSelectTime, onSelectFooter, close]
  )

  const enableScrollExpand = () => {
    allowScrollExpandRef.current = true
  }

  return (
    <div className="relative">
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={showList ? listboxId : undefined}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-activedescendant={comboboxActiveDescendant(listboxId, showList, highlightIndex)}
          readOnly
          autoComplete="off"
          value={displayValue}
          placeholder="Select a time"
          onFocus={() => {
            allowScrollExpandRef.current = false
            handleFocus()
          }}
          onBlur={() => handleBlur()}
          onKeyDown={(e) =>
            handleListKeyDown(e, {
              showList,
              suggestionCount: optionCount,
              onSelectIndex: selectIndex,
              selectSoleMatch: false,
              onClose: close,
            })
          }
          className={`${INPUT_CLASS} cursor-pointer pr-9`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-base-content/50">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </span>
      </div>
      {showList && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className={`${COMBOBOX_LIST_CLASS} max-h-52`}
          onWheel={onScrollToBottom ? enableScrollExpand : undefined}
          onPointerDown={onScrollToBottom ? enableScrollExpand : undefined}
          onTouchStart={onScrollToBottom ? enableScrollExpand : undefined}
          onScroll={
            onScrollToBottom
              ? (e) => {
                  if (!allowScrollExpandRef.current) return
                  const el = e.currentTarget
                  if (
                    endTimeListScrolledToBottom(el.scrollTop, el.clientHeight, el.scrollHeight)
                  ) {
                    allowScrollExpandRef.current = false
                    onScrollToBottom()
                    close()
                  }
                }
              : undefined
          }
        >
          {slots.map((slot, index) => {
            const highlighted = index === highlightIndex
            const selected = index === selectedSlotIndex
            return (
              <li
                key={slot}
                id={comboboxOptionId(listboxId, index)}
                role="option"
                aria-selected={highlighted || selected}
                className={comboboxOptionClassName(highlighted, selected && "font-medium")}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectIndex(index)}
              >
                {formatTimeSlotLabel(slot)}
              </li>
            )
          })}
          {footerLabel && onSelectFooter ? (
            <li
              id={comboboxOptionId(listboxId, slots.length)}
              role="option"
              aria-selected={highlightIndex === slots.length}
              className={comboboxOptionClassName(
                highlightIndex === slots.length,
                slots.length > 0 && "border-t border-base-300 mt-1 pt-2"
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectIndex(slots.length)}
            >
              {footerLabel}
            </li>
          ) : null}
        </ul>
      )}
    </div>
  )
}

type EndTimeListProps = {
  startTime: string
  endTimeValue: string
  onSelectTime: (time: string) => void
  onExpandMultiDay: () => void
}

function EndTimeList({
  startTime,
  endTimeValue,
  onSelectTime,
  onExpandMultiDay,
}: EndTimeListProps) {
  const start = splitLocalDateTime(startTime)
  const slots = useMemo(() => endTimeSlotsAfter(start?.time ?? ""), [start?.time])

  return (
    <TimeSlotList
      id="pin-end-time"
      name="end_time"
      label="End time"
      value={endTimeValue}
      slots={slots}
      onSelectTime={onSelectTime}
      footerLabel={DIFFERENT_DAY_LABEL}
      onSelectFooter={onExpandMultiDay}
      onScrollToBottom={onExpandMultiDay}
    />
  )
}
