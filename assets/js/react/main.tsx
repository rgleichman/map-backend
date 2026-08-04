import React from "react"
import { createRoot } from "react-dom/client"
import { setWorkerUrl } from "maplibre-gl"
import App from "./App"

const container = document.getElementById("react-root") as HTMLDivElement | null
if (container) {
  const { userId, csrf, styleUrl, communityUrl, userMuted, maplibreWorkerUrl } =
    container.dataset as {
      userId?: string
      csrf?: string
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
        csrfToken={csrf}
        styleUrl={styleUrl}
        communityUrl={communityUrl}
      />
    </React.StrictMode>
  )
}
