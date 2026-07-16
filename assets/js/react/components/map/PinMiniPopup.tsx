import React, { useMemo } from "react"
import type { Pin } from "../../types"
import { CustomFieldDisplay, PinIdProvider } from "../CustomPinFields"
import PinTypeBadge from "../PinTypeBadge"
import { usePinTypes } from "../../context/PinTypesContext"
import { BlobFieldType } from "../../utils/blobFieldType"
import { isCustomFieldEmpty } from "../../utils/customFieldValue"
import { findCustomPinType, isCustomPinType, schemaFields } from "../../utils/customPinTypes"
import { getPinTypeLabel } from "../../utils/pinTypeIcons"

type Props = {
  pin: Pin
}

/** Compact map popup: title, type, and blob media (drawing + music) only. */
export default function PinMiniPopup({ pin }: Props) {
  const { catalog } = usePinTypes()
  const customType = isCustomPinType(pin.pin_type) ? findCustomPinType(pin.pin_type, catalog) : undefined
  const typeLabel = getPinTypeLabel(pin.pin_type, catalog)

  const mediaFields = useMemo(() => {
    const fields = schemaFields(customType)
    return fields.filter((field) => {
      if (field.type !== BlobFieldType.Drawing && field.type !== BlobFieldType.Music) return false
      return !isCustomFieldEmpty(pin.custom_data?.[field.key], field)
    })
  }, [customType, pin.custom_data])

  return (
    <div className="min-w-[10rem] max-w-[16rem]">
      <div className="flex items-start gap-2">
        <PinTypeBadge pinType={pin.pin_type} catalog={catalog} size="sm" className="mt-0.5" />
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-snug text-base-content truncate">{pin.title}</p>
          <p className="text-xs text-base-content/70 mt-0.5">{typeLabel}</p>
        </div>
      </div>
      {mediaFields.length > 0 ? (
        <PinIdProvider pinId={pin.id}>
          <div className="mt-2 space-y-2">
            {mediaFields.map((field) => (
              <div key={field.key}>
                <p className="text-xs font-medium text-base-content/80 mb-0.5">{field.label}</p>
                <CustomFieldDisplay field={field} value={pin.custom_data?.[field.key]} />
              </div>
            ))}
          </div>
        </PinIdProvider>
      ) : null}
    </div>
  )
}
