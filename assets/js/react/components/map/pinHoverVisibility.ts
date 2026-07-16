/** Whether a desktop pin hover tooltip should appear for the given pin. */
export function shouldShowPinHoverTooltip({
  isDesktop,
  hideMiniPopup,
  detailPinId,
  hoverPinId,
}: {
  isDesktop: boolean
  hideMiniPopup: boolean
  detailPinId: number | null
  hoverPinId: number
}): boolean {
  if (!isDesktop || hideMiniPopup) return false
  if (detailPinId != null && detailPinId === hoverPinId) return false
  return true
}
