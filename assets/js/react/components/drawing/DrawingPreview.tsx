import React, { useEffect, useRef } from "react"
import type { DrawingData } from "../../utils/drawingPayload"
import { parseDrawing, renderDrawingToCanvas } from "../../utils/drawingPayload"

type Props = {
  data: DrawingData
  className?: string
  size?: number
}

export default function DrawingPreview({ data, className, size = 128 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    renderDrawingToCanvas(ctx, data)
  }, [data])

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
  if (!data.strokes.some((s) => s.points.length >= 2)) {
    return <span className={className}>Drawing</span>
  }
  return <DrawingPreview data={data} className={className} size={128} />
}
