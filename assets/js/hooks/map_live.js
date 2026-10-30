export const MapLive = {
  mounted() {
    this.handleEvent("map:set-scope", (payload) => {
      window.dispatchEvent(new CustomEvent("map:set-scope", { detail: payload }))
    })
  },
}
