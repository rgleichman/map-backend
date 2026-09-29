import { describe, expect, it } from "vitest"
import {
  addDaysToDate,
  addHoursToLocalDateTime,
  applyEndDate,
  applyEndTimeOfDay,
  applyExpandToMultiDay,
  applySingleDate,
  applyStartDate,
  applyStartTimeOfDay,
  bumpEndIfNeeded,
  endTimeListScrolledToBottom,
  dayTimeSlots,
  endTimeSlotsAfter,
  enterMultiDayEnd,
  formatTimeSlotLabel,
  isSameCalendarDay,
  joinLocalDateTime,
  splitLocalDateTime,
} from "./eventSchedule"

describe("splitLocalDateTime / joinLocalDateTime", () => {
  it("splits datetime-local values", () => {
    expect(splitLocalDateTime("2026-06-01T10:00")).toEqual({ date: "2026-06-01", time: "10:00" })
    expect(splitLocalDateTime("2026-06-01T10:00:00")).toEqual({ date: "2026-06-01", time: "10:00" })
  })

  it("returns null for empty or time-only values", () => {
    expect(splitLocalDateTime("")).toBeNull()
    expect(splitLocalDateTime("10:00")).toBeNull()
  })

  it("joins date and time into datetime-local", () => {
    expect(joinLocalDateTime("2026-06-01", "9:05")).toBe("2026-06-01T09:05")
    expect(joinLocalDateTime("2026-06-01", "10:00:00")).toBe("2026-06-01T10:00")
  })
})

describe("isSameCalendarDay", () => {
  it("is true when dates match", () => {
    expect(isSameCalendarDay("2026-06-01T10:00", "2026-06-01T22:00")).toBe(true)
  })

  it("is false when dates differ", () => {
    expect(isSameCalendarDay("2026-06-01T22:00", "2026-06-02T02:00")).toBe(false)
  })

  it("treats incomplete values as same-day (single-date UI)", () => {
    expect(isSameCalendarDay("", "2026-06-01T10:00")).toBe(true)
    expect(isSameCalendarDay("10:00", "12:00")).toBe(true)
  })
})

describe("addDaysToDate", () => {
  it("rolls over months and years", () => {
    expect(addDaysToDate("2026-06-01", 1)).toBe("2026-06-02")
    expect(addDaysToDate("2026-01-31", 1)).toBe("2026-02-01")
    expect(addDaysToDate("2026-12-31", 1)).toBe("2027-01-01")
  })

  it("handles leap day", () => {
    expect(addDaysToDate("2024-02-28", 1)).toBe("2024-02-29")
    expect(addDaysToDate("2024-02-29", 1)).toBe("2024-03-01")
  })
})

describe("dayTimeSlots", () => {
  it("lists every 15-minute slot from midnight through 11:45 PM", () => {
    const slots = dayTimeSlots()
    expect(slots[0]).toBe("00:00")
    expect(slots[1]).toBe("00:15")
    expect(slots.at(-1)).toBe("23:45")
    expect(slots).toHaveLength(96)
  })
})

describe("endTimeSlotsAfter", () => {
  it("lists 15-minute slots strictly after start through 11:45 PM", () => {
    expect(endTimeSlotsAfter("10:00").slice(0, 3)).toEqual(["10:15", "10:30", "10:45"])
    expect(endTimeSlotsAfter("10:00").at(-1)).toBe("23:45")
    expect(endTimeSlotsAfter("10:07")[0]).toBe("10:15")
    expect(endTimeSlotsAfter("10:15")[0]).toBe("10:30")
  })

  it("is empty when no same-day slot remains", () => {
    expect(endTimeSlotsAfter("23:45")).toEqual([])
    expect(endTimeSlotsAfter("23:50")).toEqual([])
  })

  it("includes the last slot when start is 23:30", () => {
    expect(endTimeSlotsAfter("23:30")).toEqual(["23:45"])
  })
})

describe("formatTimeSlotLabel", () => {
  it("formats 12-hour labels", () => {
    expect(formatTimeSlotLabel("00:00")).toBe("12:00 AM")
    expect(formatTimeSlotLabel("10:15")).toBe("10:15 AM")
    expect(formatTimeSlotLabel("12:00")).toBe("12:00 PM")
    expect(formatTimeSlotLabel("23:45")).toBe("11:45 PM")
  })
})

describe("enterMultiDayEnd / applyExpandToMultiDay", () => {
  it("sets end to next-day midnight", () => {
    expect(enterMultiDayEnd("2026-06-01T10:00")).toBe("2026-06-02T00:00")
    expect(applyExpandToMultiDay("2026-12-31T23:00")).toEqual({
      startTime: "2026-12-31T23:00",
      endTime: "2027-01-01T00:00",
    })
  })
})

describe("bumpEndIfNeeded", () => {
  it("keeps end when it is after start", () => {
    expect(bumpEndIfNeeded("2026-06-01T10:00", "2026-06-01T12:00")).toBe("2026-06-01T12:00")
    expect(bumpEndIfNeeded("2026-06-01T22:00", "2026-06-02T02:00")).toBe("2026-06-02T02:00")
  })

  it("bumps to start + 1 hour on the same day", () => {
    expect(bumpEndIfNeeded("2026-06-01T10:00", "2026-06-01T09:00")).toBe("2026-06-01T11:00")
    expect(bumpEndIfNeeded("2026-06-01T10:00", "2026-06-01T10:00")).toBe("2026-06-01T11:00")
  })

  it("uses next-day 00:00 when +1 hour crosses midnight", () => {
    expect(bumpEndIfNeeded("2026-06-01T23:30", "2026-06-01T23:00")).toBe("2026-06-02T00:00")
  })
})

describe("applySingleDate", () => {
  it("rewrites both dates and keeps times", () => {
    expect(applySingleDate("2026-06-01T10:00", "2026-06-01T12:00", "2026-07-04")).toEqual({
      startTime: "2026-07-04T10:00",
      endTime: "2026-07-04T12:00",
    })
  })

  it("bumps end when times would invert", () => {
    expect(applySingleDate("2026-06-01T10:00", "2026-06-02T09:00", "2026-06-01")).toEqual({
      startTime: "2026-06-01T10:00",
      endTime: "2026-06-01T11:00",
    })
  })
})

describe("applyStartDate / applyEndDate", () => {
  it("changes only the start date and bumps end if needed", () => {
    expect(applyStartDate("2026-06-01T10:00", "2026-06-02T02:00", "2026-06-03")).toEqual({
      startTime: "2026-06-03T10:00",
      endTime: "2026-06-03T11:00",
    })
  })

  it("clamps an earlier end date to the start date", () => {
    expect(applyEndDate("2026-06-02T10:00", "2026-06-03T12:00", "2026-06-01")).toEqual({
      startTime: "2026-06-02T10:00",
      endTime: "2026-06-02T12:00",
    })
  })

  it("collapses to same-day when end date matches start", () => {
    const next = applyEndDate("2026-06-01T10:00", "2026-06-02T12:00", "2026-06-01")
    expect(next).toEqual({ startTime: "2026-06-01T10:00", endTime: "2026-06-01T12:00" })
    expect(isSameCalendarDay(next.startTime, next.endTime)).toBe(true)
  })
})

describe("applyStartTimeOfDay / applyEndTimeOfDay", () => {
  it("updates start time and bumps end on the same day", () => {
    expect(applyStartTimeOfDay("2026-06-01T10:00", "2026-06-01T11:00", "11:00")).toEqual({
      startTime: "2026-06-01T11:00",
      endTime: "2026-06-01T12:00",
    })
  })

  it("does not collapse an overnight end when start time changes", () => {
    expect(applyStartTimeOfDay("2026-06-01T22:00", "2026-06-02T02:00", "23:00")).toEqual({
      startTime: "2026-06-01T23:00",
      endTime: "2026-06-02T02:00",
    })
  })

  it("joins a same-day end slot onto the event date", () => {
    expect(applyEndTimeOfDay("2026-06-01T10:00", "2026-06-01T11:00", "15:30")).toBe(
      "2026-06-01T15:30"
    )
  })

  it("keeps the end date when updating time on a multi-day event", () => {
    expect(applyEndTimeOfDay("2026-06-01T22:00", "2026-06-02T02:00", "03:00")).toBe(
      "2026-06-02T03:00"
    )
  })
})

describe("addHoursToLocalDateTime", () => {
  it("adds hours with day rollover", () => {
    expect(addHoursToLocalDateTime("2026-06-01T23:00", 2)).toBe("2026-06-02T01:00")
  })
})

describe("endTimeListScrolledToBottom", () => {
  it("requires a real scroll, not a visible last row at rest", () => {
    expect(endTimeListScrolledToBottom(0, 200, 200)).toBe(false)
    expect(endTimeListScrolledToBottom(0, 200, 400)).toBe(false)
    expect(endTimeListScrolledToBottom(200, 200, 400)).toBe(true)
    expect(endTimeListScrolledToBottom(192, 200, 400)).toBe(true)
    expect(endTimeListScrolledToBottom(50, 200, 400)).toBe(false)
  })
})
