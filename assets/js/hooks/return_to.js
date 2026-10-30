const RETURN_TO_KEY = "storymap:returnTo"

const writeHiddenReturnTo = (form) => {
  if (!(form instanceof HTMLFormElement)) return
  let stored
  try {
    stored = sessionStorage.getItem(RETURN_TO_KEY)
  } catch {
    stored = null
  }
  if (!stored) return
  let input = form.querySelector('input[name="user[return_to]"]')
  if (!input) {
    input = document.createElement("input")
    input.type = "hidden"
    input.name = "user[return_to]"
    form.appendChild(input)
  }
  input.value = stored
}

export const ReturnTo = {
  mounted() {
    this.handleEvent("store_return_to", ({ path }) => {
      try {
        sessionStorage.setItem(RETURN_TO_KEY, path)
      } catch {
        // ignore
      }
      writeHiddenReturnTo(this.el)
    })
    writeHiddenReturnTo(this.el)
  },
}
