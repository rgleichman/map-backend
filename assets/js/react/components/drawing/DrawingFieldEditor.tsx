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

function drawingSummary(drawing: ReturnType<typeof emptyDrawing>): string {
  const frames = drawing.frames.length
  if (frames > 1) {
    return `${drawing.width}×${drawing.height} · ${frames} frames · ${drawing.fps} fps`
  }
  const strokes = strokeCount(drawing, 0)
  return `${drawing.width}×${drawing.height} · ${strokes} stroke${strokes === 1 ? "" : "s"}`
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
      renderSummary={drawingSummary}
      renderEditor={({ data, onChange, disabled }) => (
        <DrawingCanvas data={data} onChange={onChange} disabled={disabled} />
      )}
      modalFillAvailable
    />
  )
}
