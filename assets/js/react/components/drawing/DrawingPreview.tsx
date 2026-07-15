import React, { useEffect, useRef, useState } from "react"
import type { DrawingData } from "../../utils/drawingPayload"
import {
  drawingHasContent,
  parseDrawing,
  renderDrawingToCanvas,
} from "../../utils/drawingPayload"
import { getAudioContext, playScoreStep } from "../../utils/musicAudio"
import { scoreHasContent } from "../../utils/musicScore"
import Button from "../ui/Button"
import { SpeakerWaveIcon, SpeakerXMarkIcon } from "../ui/icons"

type Props = {
  data: DrawingData
  className?: string
  size?: number
}

export default function DrawingPreview({ data, className, size = 128 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [frameIndex, setFrameIndex] = useState(0)
  const [muted, setMuted] = useState(true)
  const mutedRef = useRef(muted)
  mutedRef.current = muted
  const frameIndexRef = useRef(frameIndex)
  frameIndexRef.current = frameIndex
  const multiFrame = data.frames.length > 1
  const soundtrack = data.soundtrack
  const hasSoundtrack = scoreHasContent(soundtrack)

  useEffect(() => {
    setFrameIndex(0)
    setMuted(true)
  }, [data])

  useEffect(() => {
    if (!multiFrame) return
    const ms = Math.max(50, Math.round(1000 / Math.max(1, data.fps)))
    const score = data.soundtrack

    const playFrameNotes = (index: number) => {
      if (mutedRef.current || !scoreHasContent(score)) return
      void (async () => {
        const ctx = getAudioContext()
        if (ctx.state === "suspended") await ctx.resume()
        playScoreStep(ctx, score, index, ms)
      })()
    }

    const id = window.setInterval(() => {
      setFrameIndex((i) => {
        const next = (i + 1) % data.frames.length
        playFrameNotes(next)
        return next
      })
    }, ms)
    return () => window.clearInterval(id)
  }, [multiFrame, data.fps, data.frames.length, data.soundtrack])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const index = multiFrame ? frameIndex : 0
    renderDrawingToCanvas(ctx, data, { frameIndex: index, onionSkin: false })
  }, [data, frameIndex, multiFrame])

  const onToggleMute = () => {
    setMuted((m) => {
      const nextMuted = !m
      if (!nextMuted && hasSoundtrack) {
        const ms = Math.max(50, Math.round(1000 / Math.max(1, data.fps)))
        const index = multiFrame ? frameIndexRef.current : 0
        void (async () => {
          const ctx = getAudioContext()
          if (ctx.state === "suspended") await ctx.resume()
          playScoreStep(ctx, soundtrack, index, ms)
        })()
      }
      return nextMuted
    })
  }

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
      {hasSoundtrack ? (
        <Button
          type="button"
          size="xs"
          variant="action"
          onClick={onToggleMute}
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
}

export function DrawingPreviewFromPayload({ payload, className }: DisplayProps) {
  const data = parseDrawing(payload)
  if (!drawingHasContent(data)) {
    return <span className={className}>Drawing</span>
  }
  return <DrawingPreview data={data} className={className} size={128} />
}
