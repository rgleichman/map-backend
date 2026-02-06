import React, { useEffect, useMemo, useRef, useState } from "react"
import { RRule } from "rrule"

const DAYS: { key: "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU"; label: string }[] = [
  { key: "MO", label: "Mon" },
  { key: "TU", label: "Tue" },
  { key: "WE", label: "Wed" },
  { key: "TH", label: "Thu" },
  { key: "FR", label: "Fri" },
  { key: "SA", label: "Sat" },
  { key: "SU", label: "Sun" },
]

const WEEKDAY_MAP = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
} as const

function timeToByHourMinute(timeValue: string): { hour: number; minute: number } {
  if (!timeValue || timeValue.length < 5) return { hour: 9, minute: 0 }
  const [h, m] = timeValue.split(":").map(Number)
  return { hour: Number.isNaN(h) ? 9 : h, minute: Number.isNaN(m) ? 0 : m }
}

function byHourMinuteToTime(hour: number, minute: number): string {
  const h = Math.max(0, Math.min(23, hour))
  const m = Math.max(0, Math.min(59, minute))
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

type Props = {
  value: string
  onChange: (rrule: string) => void
  /** Timezone from pin location (read-only; backend sets from lat/lng). */
  timezone: string
  onTimezoneChange?: (tz: string) => void
  /** When set, time comes from parent (Start time); hide internal time input and use this for BYHOUR/BYMINUTE. */
  timeOfDay?: string
}

export default function ScheduleRruleBuilder({ value, onChange, timezone, timeOfDay }: Props) {
  const [selectedDays, setSelectedDays] = useState<Set<string>>(() => new Set(["MO"]))
  const [timeValue, setTimeValue] = useState("09:00")
  const timeToUse = timeOfDay ?? timeValue
  const hasSyncedFromValue = useRef(false)
  const prevTimeOfDayRef = useRef<string | undefined>(undefined)
  const hasEmittedDefaultForEmpty = useRef(false)

  const parsed = useMemo(() => {
    if (!value || value.trim() === "") return null
    try {
      return RRule.fromString(value)
    } catch {
      return null
    }
  }, [value])

  useEffect(() => {
    if (!parsed) {
      if (!value || value.trim() === "") hasSyncedFromValue.current = true
      return
    }
    const opts = parsed.options
    const days = new Set<string>()
    if (opts.byweekday && opts.byweekday.length > 0) {
      const strMap: Record<number, string> = {
        0: "MO",
        1: "TU",
        2: "WE",
        3: "TH",
        4: "FR",
        5: "SA",
        6: "SU",
      }
      for (const wd of opts.byweekday) {
        const s = strMap[wd]
        if (s) days.add(s)
      }
    }
    if (days.size > 0) {
      setSelectedDays(days)
      prevTimeOfDayRef.current = undefined
    }
    if (timeOfDay === undefined) {
      const h = opts.byhour?.[0] ?? 9
      const m = opts.byminute?.[0] ?? 0
      setTimeValue(byHourMinuteToTime(h, m))
    }
  }, [parsed, timeOfDay, value])

  useEffect(() => {
    if (timeOfDay !== undefined && value?.trim()) hasSyncedFromValue.current = true
  }, [selectedDays, timeOfDay, value])

  const buildRuleString = (days: Set<string>, time: string): string => {
    const byweekday = DAYS.filter((d) => days.has(d.key)).map((d) => WEEKDAY_MAP[d.key])
    if (byweekday.length === 0) return ""
    const { hour, minute } = timeToByHourMinute(time)
    const rule = new RRule({
      freq: RRule.WEEKLY,
      byweekday,
      byhour: [hour],
      byminute: [minute],
    })
    return rule.toString()
  }

  const emitRule = (days: Set<string>, time: string) => {
    const next = buildRuleString(days, time)
    if (next === "") onChange("")
    else onChange(next)
  }

  // When value is empty on load, push the visible default to parent once so it gets saved
  useEffect(() => {
    if (value.trim() !== "" || hasEmittedDefaultForEmpty.current) return
    const defaultRule = buildRuleString(selectedDays, timeToUse)
    if (defaultRule) {
      hasEmittedDefaultForEmpty.current = true
      onChange(defaultRule)
    }
  }, [value, selectedDays, timeToUse, onChange])

  useEffect(() => {
    if (timeOfDay === undefined) return
    const synced = hasSyncedFromValue.current
    if (!synced) return
    if (!timeOfDay || timeOfDay.length < 5) return
    if (prevTimeOfDayRef.current === undefined) {
      prevTimeOfDayRef.current = timeOfDay
      return
    }
    if (prevTimeOfDayRef.current === timeOfDay) return
    prevTimeOfDayRef.current = timeOfDay
    const next = buildRuleString(selectedDays, timeOfDay)
    const normNext = next
    const normValue = value
    const willEmit = next !== "" && normNext !== normValue
    if (next === "") {
      onChange("")
      return
    }
    if (willEmit) onChange(next)
  }, [timeOfDay])

  const toggleDay = (key: string) => {
    const next = new Set(selectedDays)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setSelectedDays(next)
    emitRule(next, timeToUse)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setTimeValue(v)
    emitRule(selectedDays, v)
  }

  const currentRrule = useMemo(
    () => buildRuleString(selectedDays, timeToUse),
    [selectedDays, timeToUse]
  )

  return (
    <div className="mb-4">
      <p className="block font-medium mb-1">Schedule (repeats weekly)</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {DAYS.map(({ key, label }) => (
          <label key={key} className="inline-flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedDays.has(key)}
              onChange={() => toggleDay(key)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </div>
      {timeOfDay === undefined && (
        <>
          <label htmlFor="pin-schedule-time-of-day" className="block font-medium mb-1">
            Time
          </label>
          <input
            id="pin-schedule-time-of-day"
            type="time"
            value={timeValue}
            onChange={handleTimeChange}
            className="w-full mb-2 px-3 py-2 rounded border"
          />
        </>
      )}
      {timezone ? (
        <p className="text-sm text-base-content/80 mb-2">
          Timezone: {timezone} (from pin location)
        </p>
      ) : (
        <p className="text-sm text-base-content/60 mb-2">
          Timezone will be set from the pin location when you save.
        </p>
      )}
      {currentRrule && (
        <div className="mt-2 text-sm">
          <span className="font-medium text-base-content/80">Rule: </span>
          <code className="block mt-1 p-2 bg-base-200 rounded text-xs break-all">{currentRrule}</code>
        </div>
      )}
    </div>
  )
}
