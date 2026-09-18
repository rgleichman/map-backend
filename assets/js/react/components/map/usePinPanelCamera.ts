import { type RefObject, useEffect } from "react"
import { type Map as MLMap, type PaddingOptions } from "maplibre-gl"
import type { Pin } from "../../types"
import {
  DESKTOP_PIN_PANEL_PADDING_DURATION_MS,
  desktopPinPanelMapPaddingRight,
} from "../../utils/siteLayout"
import {
  PIN_PANEL_EDGE_MARGIN_PX,
  targetScreenPointInPaddedViewport,
} from "./pinPanelCamera"

/** Re-solve at fixed zoom when globe coupling leaves residual screen error. */
const PIN_PANEL_SPHERE_SOLVE_ITERATIONS = 4

function mapPaddingForPinPanel(map: MLMap, panelOpen: boolean): PaddingOptions {
  const right = desktopPinPanelMapPaddingRight(map.getContainer().clientWidth, panelOpen)
  return { top: 0, bottom: 0, left: 0, right }
}

/** Visual center of the padded viewport (MapLibre `centerPoint` equivalent). */
function paddedCenterPoint(
  mapWidth: number,
  mapHeight: number,
  padding: { top: number; right: number; bottom: number; left: number },
): { x: number; y: number } {
  return {
    x: padding.left + (mapWidth - padding.left - padding.right) / 2,
    y: padding.top + (mapHeight - padding.top - padding.bottom) / 2,
  }
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
 * If the focused pin would leave the visible area, rotate the sphere (lng+lat)
 * so the pin sits just inside the padded margin — zoom is never changed.
 * Closing clears padding only; center/bearing/zoom stay as they are.
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

    /**
     * Sphere-accurate pan at a locked zoom: easeTo(center=pin, offset→target)
     * uses MapLibre’s globe setLocationAtPoint under the hood, while `zoom`
     * in options prevents the lat→zoom planet-size adjustment.
     */
    const placePinAtScreenPoint = (
      lngLat: [number, number],
      target: { x: number; y: number },
      zoom: number,
      panelPadding: { top: number; right: number; bottom: number; left: number },
      mapWidth: number,
      mapHeight: number,
      bearing: number,
      pitch: number,
    ): void => {
      const cp = paddedCenterPoint(mapWidth, mapHeight, panelPadding)
      map.easeTo({
        center: lngLat,
        zoom,
        bearing,
        pitch,
        padding: panelPadding,
        offset: [target.x - cp.x, target.y - cp.y],
        duration: 0,
        animate: false,
      })
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

      const sample = {
        center: map.getCenter(),
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
        padding: map.getPadding(),
      }

      let nextCenter: { lng: number; lat: number } | undefined
      const lngLat = focusLngLat()

      if (lngLat) {
        // Apply padding first so centerPoint / project use the panel viewport.
        map.jumpTo({
          center: sample.center,
          zoom: sample.zoom,
          bearing: sample.bearing,
          pitch: sample.pitch,
          padding: panelPadding,
        })

        for (let i = 0; i < PIN_PANEL_SPHERE_SOLVE_ITERATIONS; i++) {
          const projected = map.project(lngLat)
          const target = targetScreenPointInPaddedViewport(
            projected.x,
            projected.y,
            mapWidth,
            mapHeight,
            panelPadding,
            PIN_PANEL_EDGE_MARGIN_PX,
          )
          if (!target) break

          placePinAtScreenPoint(
            lngLat,
            target,
            sample.zoom,
            panelPadding,
            mapWidth,
            mapHeight,
            sample.bearing,
            sample.pitch,
          )
          nextCenter = { lng: map.getCenter().lng, lat: map.getCenter().lat }

          // Keep zoom locked if anything drifted.
          if (Math.abs(map.getZoom() - sample.zoom) > 1e-6) {
            map.jumpTo({
              center: [nextCenter.lng, nextCenter.lat],
              zoom: sample.zoom,
              bearing: sample.bearing,
              pitch: sample.pitch,
              padding: panelPadding,
            })
          }
        }

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
      const sameCenter =
        nextCenter == null ||
        (Math.abs(map.getCenter().lng - nextCenter.lng) < 1e-7 &&
          Math.abs(map.getCenter().lat - nextCenter.lat) < 1e-7)
      if (samePadding && sameCenter) return

      // Always pass zoom so globe easeTo does not auto-adjust on lat change.
      const camera = {
        padding: panelPadding,
        zoom: sample.zoom,
        ...(nextCenter ? { center: [nextCenter.lng, nextCenter.lat] as [number, number] } : {}),
      }
      if (animate) {
        map.easeTo({ ...camera, duration: DESKTOP_PIN_PANEL_PADDING_DURATION_MS })
      } else {
        map.jumpTo(camera)
      }
    }

    const clearPanelCamera = (animate: boolean) => {
      const padding = zeroPadding
      const current = map.getPadding()
      const samePadding =
        Math.abs((current.top ?? 0) - padding.top) < 1 &&
        Math.abs((current.right ?? 0) - padding.right) < 1 &&
        Math.abs((current.bottom ?? 0) - padding.bottom) < 1 &&
        Math.abs((current.left ?? 0) - padding.left) < 1
      if (samePadding) return

      const zoom = map.getZoom()
      if (animate) {
        map.easeTo({ padding, zoom, duration: DESKTOP_PIN_PANEL_PADDING_DURATION_MS })
      } else {
        map.jumpTo({ padding, zoom })
      }
    }

    if (pinPanelOpen) {
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
