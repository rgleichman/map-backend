import { type RefObject, useCallback, useEffect, useRef } from "react"
import { createRoot } from "react-dom/client"
import { Popup, type Map as MLMap } from "maplibre-gl"
import type { BuiltinPinType, CustomPinType, Pin } from "../../types"
import { PinTypesProvider } from "../../context/PinTypesContext"
import { desktopPinPanelMapPaddingRight } from "../../utils/siteLayout"
import PinHoverTooltip from "./PinHoverTooltip"
import { shouldShowPinHoverTooltip } from "./pinHoverVisibility"
import { hoverPopupMaxSize } from "./pinHoverFields"
import {
  choosePinHoverPopupAnchor,
  pinHoverPopupOffset,
  pinHoverPopupPadding,
} from "./pinHoverPopupPosition"

type UsePinHoverPopupArgs = {
  catalogRef: RefObject<CustomPinType[]>
  enabledBuiltinsRef: RefObject<BuiltinPinType[]>
  isDesktopRef: RefObject<boolean>
  placementActiveRef: RefObject<boolean>
  detailPinIdRef: RefObject<number | null | undefined>
  pinPanelOpenRef: RefObject<boolean>
  isDesktop: boolean
  placementActive: boolean
  detailPinId: number | null | undefined
}

export type PinHoverPopupApi = {
  showHoverTooltip: (map: MLMap, pin: Pin) => void
  clearHoverTooltip: () => void
}

export function usePinHoverPopup({
  catalogRef,
  enabledBuiltinsRef,
  isDesktopRef,
  placementActiveRef,
  detailPinIdRef,
  pinPanelOpenRef,
  isDesktop,
  placementActive,
  detailPinId,
}: UsePinHoverPopupArgs): PinHoverPopupApi {
  const hoverPopupRef = useRef<Popup | null>(null)
  const hoverPinIdRef = useRef<number | null>(null)
  const hoverRootRef = useRef<ReturnType<typeof createRoot> | null>(null)

  const clearHoverTooltip = useCallback((): void => {
    const root = hoverRootRef.current
    const popup = hoverPopupRef.current
    hoverPopupRef.current = null
    hoverPinIdRef.current = null
    hoverRootRef.current = null
    root?.unmount()
    popup?.remove()
  }, [])

  const renderHoverTooltipContent = useCallback(
    (
      pin: Pin,
      opts: { maxWidth: number; maxHeight: number; onReady?: () => void },
    ) => (
      <PinTypesProvider catalog={catalogRef.current} enabledBuiltins={enabledBuiltinsRef.current}>
        <PinHoverTooltip
          pin={pin}
          maxWidth={opts.maxWidth}
          maxHeight={opts.maxHeight}
          onReady={opts.onReady}
        />
      </PinTypesProvider>
    ),
    [catalogRef, enabledBuiltinsRef],
  )

  const applyHoverPopupAnchor = useCallback(
    (
      map: MLMap,
      popup: Popup,
      pin: Pin,
      size: { width: number; height: number },
    ): void => {
      const point = map.project([pin.longitude, pin.latitude])
      const containerEl = map.getContainer()
      const panelRight = desktopPinPanelMapPaddingRight(
        containerEl.clientWidth,
        pinPanelOpenRef.current,
      )
      const padding = pinHoverPopupPadding(panelRight)
      popup.options.padding = padding
      popup.options.anchor = choosePinHoverPopupAnchor({
        x: point.x,
        y: point.y,
        mapWidth: containerEl.clientWidth,
        mapHeight: containerEl.clientHeight,
        popupWidth: size.width,
        popupHeight: size.height,
        padding,
      })
      popup.setLngLat([pin.longitude, pin.latitude])
    },
    [pinPanelOpenRef],
  )

  const showHoverTooltip = useCallback(
    (map: MLMap, pin: Pin): void => {
      if (
        !shouldShowPinHoverTooltip({
          isDesktop: isDesktopRef.current,
          placementActive: placementActiveRef.current,
          detailPinId: detailPinIdRef.current ?? null,
          hoverPinId: pin.id,
        })
      ) {
        clearHoverTooltip()
        return
      }

      const containerEl = map.getContainer()
      const panelRight = desktopPinPanelMapPaddingRight(
        containerEl.clientWidth,
        pinPanelOpenRef.current,
      )
      const visibleWidth = Math.max(0, containerEl.clientWidth - panelRight)
      const { maxWidth, maxHeight } = hoverPopupMaxSize(
        visibleWidth,
        containerEl.clientHeight,
      )
      const padding = pinHoverPopupPadding(panelRight)

      if (hoverPopupRef.current && hoverPinIdRef.current === pin.id && hoverRootRef.current) {
        hoverRootRef.current.render(
          renderHoverTooltipContent(pin, { maxWidth, maxHeight }),
        )
        const existing = hoverPopupRef.current.getElement()
        applyHoverPopupAnchor(map, hoverPopupRef.current, pin, {
          width: existing?.offsetWidth || maxWidth,
          height: existing?.offsetHeight || maxHeight,
        })
        return
      }

      clearHoverTooltip()

      const container = document.createElement("div")
      const root = createRoot(container)
      // Explicit anchor (via applyHoverPopupAnchor) prefers left; flips near edges / panel.
      const popup = new Popup({
        className: "pin-hover-popup",
        closeButton: false,
        locationOccludedOpacity: 0.7,
        maxWidth: `${maxWidth}px`,
        closeOnClick: false,
        offset: pinHoverPopupOffset,
        padding,
      })
        .setDOMContent(container)
        .addTo(map)
      applyHoverPopupAnchor(map, popup, pin, { width: maxWidth, height: maxHeight })
      // Hide empty MapLibre chrome until React has painted the full tooltip.
      const popupEl = popup.getElement()
      if (popupEl) {
        popupEl.style.visibility = "hidden"
      }
      root.render(
        renderHoverTooltipContent(pin, {
          maxWidth,
          maxHeight,
          onReady: () => {
            if (hoverPopupRef.current !== popup) return
            // Reposition with final content size so edge-aware anchoring is accurate.
            applyHoverPopupAnchor(map, popup, pin, {
              width: popupEl?.offsetWidth || maxWidth,
              height: popupEl?.offsetHeight || maxHeight,
            })
            popupEl?.style.removeProperty("visibility")
          },
        }),
      )
      hoverPopupRef.current = popup
      hoverPinIdRef.current = pin.id
      hoverRootRef.current = root
    },
    [
      applyHoverPopupAnchor,
      clearHoverTooltip,
      detailPinIdRef,
      isDesktopRef,
      pinPanelOpenRef,
      placementActiveRef,
      renderHoverTooltipContent,
    ],
  )

  // Drop hover tooltip when desktop/placement/selection suppress it.
  useEffect(() => {
    if (!isDesktop || placementActive) {
      clearHoverTooltip()
      return
    }
    if (detailPinId != null && hoverPinIdRef.current === detailPinId) {
      clearHoverTooltip()
    }
  }, [isDesktop, placementActive, detailPinId, clearHoverTooltip])

  return { showHoverTooltip, clearHoverTooltip }
}
