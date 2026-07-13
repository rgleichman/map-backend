// Runs before paint to apply saved theme and avoid flash of wrong theme.
(() => {
  const setTheme = (theme) => {
    if (theme === "system") {
      localStorage.removeItem("phx:theme")
      document.documentElement.removeAttribute("data-theme")
    } else {
      localStorage.setItem("phx:theme", theme)
      document.documentElement.setAttribute("data-theme", theme)
    }
  }
  if (!document.documentElement.hasAttribute("data-theme")) {
    setTheme(localStorage.getItem("phx:theme") || "system")
  }
  window.addEventListener("storage", (e) => e.key === "phx:theme" && setTheme(e.newValue || "system"))
  window.addEventListener("phx:set-theme", (e) => setTheme(e.target.dataset.phxTheme))
})()
