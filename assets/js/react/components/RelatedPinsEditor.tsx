import React, { useState } from "react"
import PinPicker from "./PinPicker"
import PinLinkChips from "./PinLinkChips"
import type { Pin } from "../types"
import { explicitPickerLinks } from "../utils/pinLinks"
import { linkedPinAddErrorMessage, validateLinkedPinAdd } from "../utils/linkedPinValidation"

type Props = {
  pins: Pin[]
  linkedPinIds: number[]
  currentPinId?: number
  onAddLinkedPin?: (pinId: number) => void
  onRemoveLinkedPin?: (pinId: number) => void
}

export default function RelatedPinsEditor({
  pins,
  linkedPinIds,
  currentPinId,
  onAddLinkedPin,
  onRemoveLinkedPin,
}: Props) {
  const [linkedPinError, setLinkedPinError] = useState<string | null>(null)

  const handleAddLinkedPin = (pin: Pin) => {
    const error = validateLinkedPinAdd(pin, { currentPinId, linkedPinIds })
    if (error) {
      setLinkedPinError(linkedPinAddErrorMessage(error))
      return
    }
    setLinkedPinError(null)
    onAddLinkedPin?.(pin.id)
  }

  const handleRemoveLinkedPin = (id: number) => {
    setLinkedPinError(null)
    onRemoveLinkedPin?.(id)
  }

  return (
    <div className="mb-4">
      <p className="block font-medium mb-1">Related pins</p>
      <p className="text-sm text-base-content/70 mb-2">
        Search pins on this map, or paste a map link and press Enter (e.g. …/map?pin=89). You can also link pins by pasting a URL in the description or any text field.
      </p>
      {linkedPinIds.length > 0 ? (
        <div className="mb-2">
          <PinLinkChips
            links={explicitPickerLinks(linkedPinIds)}
            pins={pins}
            onRemove={handleRemoveLinkedPin}
          />
        </div>
      ) : null}
      {linkedPinError ? (
        <p className="mb-2 text-sm text-error" role="alert">{linkedPinError}</p>
      ) : null}
      {onAddLinkedPin ? (
        <PinPicker
          pins={pins}
          excludePinIds={[...(currentPinId != null ? [currentPinId] : []), ...linkedPinIds]}
          onSelect={handleAddLinkedPin}
          onError={setLinkedPinError}
          onInputChange={() => setLinkedPinError(null)}
        />
      ) : null}
    </div>
  )
}
