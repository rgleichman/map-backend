import React from "react"
import { createRoot } from "react-dom/client"
import { setWorkerUrl } from "maplibre-gl"
import App from "./App"
import { bindContentOverlayEvents } from "./utils/contentOverlay"

function csrfFromMeta(): string | undefined {
  return document.querySelector("meta[name='csrf-token']")?.getAttribute("content") ?? undefined
}

bindContentOverlayEvents()

const container = document.getElementById("react-root") as HTMLDivElement | null
if (container) {
  const { userId, styleUrl, communityUrl, userMuted, maplibreWorkerUrl } =
    container.dataset as {
      userId?: string
      styleUrl?: string
      communityUrl?: string
      userMuted?: string
      maplibreWorkerUrl?: string
    }

  if (maplibreWorkerUrl) {
    setWorkerUrl(maplibreWorkerUrl)
  }

  const root = createRoot(container)
  root.render(
    <React.StrictMode>
      <App
        userId={userId ? parseInt(userId, 10) : undefined}
        userMuted={userMuted === "true"}
        csrfToken={csrfFromMeta()}
        styleUrl={styleUrl}
        communityUrl={communityUrl || undefined}
      />
    </React.StrictMode>
  )
}
