import React, { useEffect, useRef, useState } from "react"
import type { DrawingData } from "../../utils/drawingPayload"
import {
  drawingHasContent,
  parseDrawing,
  renderDrawingToCanvas,
} from "../../utils/drawingPayload"
import { scoreHasContent } from "../../utils/musicScore"
import { useDrawingFramePlayback } from "../../hooks/useDrawingFramePlayback"
import Button from "../ui/Button"
import { SpeakerWaveIcon, SpeakerXMarkIcon } from "../ui/icons"

type Props = {
  data: DrawingData
  className?: string
  size?: number
  /** When false, keep muted and hide unmute (e.g. pin hover skim). Default true. */
  showSoundtrackControl?: boolean
}

export default function DrawingPreview({
  data,
  className,
  size = 128,
  showSoundtrackControl = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [frameIndex, setFrameIndex] = useState(0)
  const [muted, setMuted] = useState(true)
  const multiFrame = data.frames.length > 1
  const soundtrack = data.soundtrack
  const hasSoundtrack = scoreHasContent(soundtrack)
  const audioAllowed = showSoundtrackControl && multiFrame && !muted && hasSoundtrack

  useEffect(() => {
    setFrameIndex(0)
    setMuted(true)
  }, [data])

  useDrawingFramePlayback({
    visualLoop: multiFrame,
    audioEnabled: audioAllowed,
    frameCount: data.frames.length,
    setFrameIndex,
    soundtrack,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const index = multiFrame ? frameIndex : 0
    renderDrawingToCanvas(ctx, data, { frameIndex: index, onionSkin: false })
  }, [data, frameIndex, multiFrame])

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <canvas
        ref={canvasRef}
        width={data.width}
        height={data.height}
        className={`rounded-box border border-base-300 bg-white dark:bg-white ${className ?? ""}`.trim()}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
      {showSoundtrackControl && hasSoundtrack ? (
        <Button
          type="button"
          size="xs"
          variant="action"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Unmute drawing soundtrack" : "Mute drawing soundtrack"}
          aria-pressed={!muted}
          className="inline-flex items-center gap-1.5"
        >
          {muted ? (
            <>
              <SpeakerXMarkIcon className="size-3.5 shrink-0" />
              Unmute
            </>
          ) : (
            <>
              <SpeakerWaveIcon className="size-3.5 shrink-0" />
              Mute
            </>
          )}
        </Button>
      ) : null}
    </div>
  )
}

type DisplayProps = {
  payload: string
  className?: string
  size?: number
  showSoundtrackControl?: boolean
}

export function DrawingPreviewFromPayload({
  payload,
  className,
  size = 128,
  showSoundtrackControl = true,
}: DisplayProps) {
  const data = parseDrawing(payload)
  if (!drawingHasContent(data)) {
    return <span className={className}>Drawing</span>
  }
  return (
    <DrawingPreview
      data={data}
      className={className}
      size={size}
      showSoundtrackControl={showSoundtrackControl}
    />
  )
}
