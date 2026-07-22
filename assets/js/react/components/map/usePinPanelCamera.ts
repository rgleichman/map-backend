import { type RefObject, useEffect, useRef } from "react"
import { type Map as MLMap, type LngLat, type PaddingOptions } from "maplibre-gl"
import type { Pin } from "../../types"
import {
  DESKTOP_PIN_PANEL_PADDING_DURATION_MS,
  desktopPinPanelMapPaddingRight,
} from "../../utils/siteLayout"
import { PIN_PANEL_EDGE_MARGIN_PX, zoomToKeepPointInPaddedViewport } from "./pinPanelCamera"

function mapPaddingForPinPanel(map: MLMap, panelOpen: boolean): PaddingOptions {
  const right = desktopPinPanelMapPaddingRight(map.getContainer().clientWidth, panelOpen)
  return { top: 0, bottom: 0, left: 0, right }
}

type UsePinPanelCameraArgs = {
  mapRef: RefObject<MLMap | null>
  mapReady: boolean
  pinPanelOpen: boolean
  pinPanelOpenRef: RefObject<boolean>
  detailPinId: number | null | undefined
  pendingLocation: { lat: number; lng: number } | null
  pinsByIdRef: RefObject<Map<number, Pin>>
  pinsRef: RefObject<Pin[]>
}

/**
 * Shift the globe left when the desktop pin panel covers the right side.
 * Zoom out if the focused pin would leave the visible area; restore zoom on close.
 */
export function usePinPanelCamera({
  mapRef,
  mapReady,
  pinPanelOpen,
  pinPanelOpenRef,
  detailPinId,
  pendingLocation,
  pinsByIdRef,
  pinsRef,
}: UsePinPanelCameraArgs): void {
  const panelCameraBackupRef = useRef<{
    center: LngLat
    zoom: number
    bearing: number
    pitch: number
  } | null>(null)

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const zeroPadding = { top: 0, bottom: 0, left: 0, right: 0 }

    const focusLngLat = (): [number, number] | null => {
      if (detailPinId != null) {
        const pin =
          pinsByIdRef.current.get(detailPinId) ??
          pinsRef.current.find((p) => p.id === detailPinId)
        if (pin) return [pin.longitude, pin.latitude]
      }
      if (pendingLocation) return [pendingLocation.lng, pendingLocation.lat]
      return null
    }

    const applyPanelCamera = (animate: boolean) => {
      const padding = mapPaddingForPinPanel(map, true)
      const mapWidth = map.getContainer().clientWidth
      const mapHeight = map.getContainer().clientHeight
      const panelPadding = {
        top: padding.top ?? 0,
        right: padding.right ?? 0,
        bottom: padding.bottom ?? 0,
        left: padding.left ?? 0,
      }

      let zoom = map.getZoom()
      const lngLat = focusLngLat()
      if (lngLat) {
        const sample = {
          center: map.getCenter(),
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
          padding: map.getPadding(),
        }
        // Sample with the real globe transform (jumpTo is sync; restore before paint).
        zoom = zoomToKeepPointInPaddedViewport({
          mapWidth,
          mapHeight,
          padding: panelPadding,
          margin: PIN_PANEL_EDGE_MARGIN_PX,
          currentZoom: sample.zoom,
          minZoom: map.getMinZoom(),
          projectAtZoom: (z) => {
            map.jumpTo({
              center: sample.center,
              zoom: z,
              bearing: sample.bearing,
              pitch: sample.pitch,
              padding: panelPadding,
            })
            const p = map.project(lngLat)
            return { x: p.x, y: p.y }
          },
        })
        map.jumpTo({
          center: sample.center,
          zoom: sample.zoom,
          bearing: sample.bearing,
          pitch: sample.pitch,
          padding: sample.padding,
        })
      }

      const current = map.getPadding()
      const samePadding =
        Math.abs((current.top ?? 0) - panelPadding.top) < 1 &&
        Math.abs((current.right ?? 0) - panelPadding.right) < 1 &&
        Math.abs((current.bottom ?? 0) - panelPadding.bottom) < 1 &&
        Math.abs((current.left ?? 0) - panelPadding.left) < 1
      const sameZoom = Math.abs(map.getZoom() - zoom) < 0.01
      if (samePadding && sameZoom) return

      if (animate) {
        map.easeTo({ padding: panelPadding, zoom, duration: DESKTOP_PIN_PANEL_PADDING_DURATION_MS })
      } else {
        map.jumpTo({ padding: panelPadding, zoom })
      }
    }

    const clearPanelCamera = (animate: boolean) => {
      const backup = panelCameraBackupRef.current
      panelCameraBackupRef.current = null
      const padding = zeroPadding
      const zoom = backup?.zoom ?? map.getZoom()
      const current = map.getPadding()
      const samePadding =
        Math.abs((current.top ?? 0) - padding.top) < 1 &&
        Math.abs((current.right ?? 0) - padding.right) < 1 &&
        Math.abs((current.bottom ?? 0) - padding.bottom) < 1 &&
        Math.abs((current.left ?? 0) - padding.left) < 1
      const sameZoom = Math.abs(map.getZoom() - zoom) < 0.01
      if (samePadding && sameZoom) return

      if (animate) {
        map.easeTo({ padding, zoom, duration: DESKTOP_PIN_PANEL_PADDING_DURATION_MS })
      } else {
        map.jumpTo({ padding, zoom })
      }
    }

    if (pinPanelOpen) {
      if (!panelCameraBackupRef.current) {
        panelCameraBackupRef.current = {
          center: map.getCenter(),
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        }
      }
      applyPanelCamera(true)
    } else {
      clearPanelCamera(true)
    }

    const onResize = () => {
      if (pinPanelOpenRef.current) applyPanelCamera(false)
    }
    map.on("resize", onResize)
    return () => {
      map.off("resize", onResize)
    }
  }, [
    pinPanelOpen,
    mapReady,
    detailPinId,
    pendingLocation,
    mapRef,
    pinPanelOpenRef,
    pinsByIdRef,
    pinsRef,
  ])
}

export { mapPaddingForPinPanel }
