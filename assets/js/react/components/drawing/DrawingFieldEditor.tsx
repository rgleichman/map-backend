import { BlobFieldType } from "../../utils/blobFieldType"
import BlobFieldEditor from "../fieldBlob/BlobFieldEditor"
import DrawingCanvas from "./DrawingCanvas"
import {
  emptyDrawing,
  parseDrawing,
  serializeDrawing,
  drawingHasContent,
  strokeCount,
} from "../../utils/drawingPayload"

export type DrawingFieldEditorProps = {
  csrfToken?: string
  pinId: number | null
  fieldKey: string
  fieldLabel?: string
  value: unknown
  onValue: (v: unknown) => void
}

export default function DrawingFieldEditor({
  csrfToken,
  pinId,
  fieldKey,
  fieldLabel = "Drawing",
  value,
  onValue,
}: DrawingFieldEditorProps) {
  return (
    <BlobFieldEditor
      blobType={BlobFieldType.Drawing}
      csrfToken={csrfToken}
      pinId={pinId}
      fieldKey={fieldKey}
      fieldLabel={fieldLabel}
      value={value}
      onValue={onValue}
      empty={emptyDrawing}
      parse={parseDrawing}
      serialize={serializeDrawing}
      hasContent={drawingHasContent}
      editLabel="Edit drawing"
      deleteLabel="Delete drawing"
      emptyHint="Open the editor to draw."
      saveEmptyError="Draw something before saving."
      renderSummary={(drawing) =>
        `${drawing.width}×${drawing.height} · ${strokeCount(drawing)} stroke${strokeCount(drawing) === 1 ? "" : "s"}`
      }
      renderEditor={({ data, onChange, disabled }) => (
        <DrawingCanvas data={data} onChange={onChange} disabled={disabled} />
      )}
      modalFillAvailable
    />
  )
}
