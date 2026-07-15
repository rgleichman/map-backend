import React, { useEffect, useRef, useState } from "react"
import type { DrawingData } from "../../utils/drawingPayload"
import {
  drawingHasContent,
  parseDrawing,
  renderDrawingToCanvas,
} from "../../utils/drawingPayload"

type Props = {
  data: DrawingData
  className?: string
  size?: number
}

export default function DrawingPreview({ data, className, size = 128 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [frameIndex, setFrameIndex] = useState(0)
  const multiFrame = data.frames.length > 1

  useEffect(() => {
    setFrameIndex(0)
  }, [data])

  useEffect(() => {
    if (!multiFrame) return
    const ms = Math.max(50, Math.round(1000 / Math.max(1, data.fps)))
    const id = window.setInterval(() => {
      setFrameIndex((i) => (i + 1) % data.frames.length)
    }, ms)
    return () => window.clearInterval(id)
  }, [multiFrame, data.fps, data.frames.length])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const index = multiFrame ? frameIndex : 0
    renderDrawingToCanvas(ctx, data, { frameIndex: index, onionSkin: false })
  }, [data, frameIndex, multiFrame])

  return (
    <canvas
      ref={canvasRef}
      width={data.width}
      height={data.height}
      className={`rounded-box border border-base-300 bg-white dark:bg-white ${className ?? ""}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
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
