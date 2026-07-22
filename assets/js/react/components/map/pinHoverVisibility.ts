/** Whether a desktop pin hover tooltip should appear for the given pin. */
export function shouldShowPinHoverTooltip({
  isDesktop,
  placementActive,
  detailPinId,
  hoverPinId,
}: {
  isDesktop: boolean
  placementActive: boolean
  detailPinId: number | null
  hoverPinId: number
}): boolean {
  if (!isDesktop || placementActive) return false
  if (detailPinId != null && detailPinId === hoverPinId) return false
  return true
}
