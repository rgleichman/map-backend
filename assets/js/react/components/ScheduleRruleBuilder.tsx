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

type Props = {
  value: string
  onChange: (rrule: string) => void
  /** Timezone from pin location (read-only; backend sets from lat/lng). */
  timezone: string
  onTimezoneChange?: (tz: string) => void
}

export default function ScheduleRruleBuilder({ value, onChange, timezone }: Props) {
  const [selectedDays, setSelectedDays] = useState<Set<string>>(() => new Set(["MO"]))
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
    if (!parsed) return
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
    if (days.size > 0) setSelectedDays(days)
  }, [parsed])

  const buildRuleString = (days: Set<string>): string => {
    const byweekday = DAYS.filter((d) => days.has(d.key)).map((d) => WEEKDAY_MAP[d.key])
    if (byweekday.length === 0) return ""
    const rule = new RRule({
      freq: RRule.WEEKLY,
      byweekday,
    })
    return rule.toString()
  }

  const emitRule = (days: Set<string>) => {
    const next = buildRuleString(days)
    if (next === "") onChange("")
    else onChange(next)
  }

  // When value is empty on load, push the visible default to parent once so it gets saved
  useEffect(() => {
    if (value.trim() !== "" || hasEmittedDefaultForEmpty.current) return
    const defaultRule = buildRuleString(selectedDays)
    if (defaultRule) {
      hasEmittedDefaultForEmpty.current = true
      onChange(defaultRule)
    }
  }, [value, selectedDays, onChange])

  const toggleDay = (key: string) => {
    const next = new Set(selectedDays)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setSelectedDays(next)
    emitRule(next)
  }

  const currentRrule = useMemo(() => buildRuleString(selectedDays), [selectedDays])

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
      {timezone ? (
        <p className="text-sm text-base-content/80 mb-2">
          Timezone: {timezone} (from pin location)
        </p>
      ) : (
        <p className="text-sm text-base-content/60 mb-2">
          Timezone will be set from the pin location when you save.
        </p>
      )}
      {/* {currentRrule && (
        <div className="mt-2 text-sm">
          <span className="font-medium text-base-content/80">Rule: </span>
          <code className="block mt-1 p-2 bg-base-200 rounded text-xs break-all">{currentRrule}</code>
        </div>
      )} */}
    </div>
  )
}
