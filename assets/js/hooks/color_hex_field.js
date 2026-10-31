export function normalizeHex(value) {
  const trimmed = String(value ?? "").trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) return `#${trimmed}`
  return null
}

const syncSwatchFromHex = (swatch, hexInput) => {
  const hex = normalizeHex(hexInput.value)
  if (hex) swatch.value = hex
}

const paintPreview = (el, color) => {
  const preview = document.getElementById("pin-type-icon-preview")
  const styleProp = el.dataset.previewStyle
  const hex = normalizeHex(color)
  if (!preview || !styleProp || !hex) return
  preview.style[styleProp] = hex
}

const emitHexChanged = (hexInput) => {
  hexInput.dispatchEvent(new Event("input", { bubbles: true }))
  hexInput.dispatchEvent(new Event("change", { bubbles: true }))
}

export const ColorHexField = {
  mounted() {
    this.swatch = this.el.querySelector("input[type=color]")
    this.hex = this.el.querySelector("input[data-color-hex]")
    if (!this.swatch || !this.hex) return

    this._onSwatchInput = () => {
      this.hex.value = this.swatch.value
      paintPreview(this.el, this.swatch.value)
      emitHexChanged(this.hex)
    }
    this._onHexInput = () => {
      syncSwatchFromHex(this.swatch, this.hex)
      paintPreview(this.el, this.hex.value)
    }

    this.swatch.addEventListener("input", this._onSwatchInput)
    this.hex.addEventListener("input", this._onHexInput)
  },

  updated() {
    if (!this.swatch || !this.hex) return
    syncSwatchFromHex(this.swatch, this.hex)
  },

  destroyed() {
    this.swatch?.removeEventListener("input", this._onSwatchInput)
    this.hex?.removeEventListener("input", this._onHexInput)
  },
}
