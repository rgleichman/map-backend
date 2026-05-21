const formatLocalTime = (el) => {
  const utc = el.getAttribute("data-utc")
  if (!utc) return

  const date = new Date(utc)
  if (Number.isNaN(date.getTime())) return

  const formatter = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  })

  el.textContent = formatter.format(date)
}

export const LocalTime = {
  mounted() {
    this.formatTimes()
  },
  updated() {
    this.formatTimes()
  },
  formatTimes() {
    this.el.querySelectorAll("time[data-utc]").forEach(formatLocalTime)
  },
}
