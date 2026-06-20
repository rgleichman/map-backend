import React, { useCallback, useEffect, useRef, useState } from "react"
import type { DrawingData, DrawingStroke, DrawingTool } from "../../utils/drawingPayload"
import {
  DRAWING_HEIGHT,
  DRAWING_WIDTH,
  drawingHasContent,
  emptyDrawing,
  renderDrawingToCanvas,
} from "../../utils/drawingPayload"

type Props = {
  data: DrawingData
  onChange: (data: DrawingData) => void
  disabled?: boolean
}

function clientPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number): [number, number] {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const x = Math.max(0, Math.min(DRAWING_WIDTH, (clientX - rect.left) * scaleX))
  const y = Math.max(0, Math.min(DRAWING_HEIGHT, (clientY - rect.top) * scaleY))
  return [Math.round(x), Math.round(y)]
}

export default function DrawingCanvas({ data, onChange, disabled = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [tool, setTool] = useState<DrawingTool>("pen")
  const [displaySize, setDisplaySize] = useState(DRAWING_WIDTH)
  const drawingRef = useRef(false)
  const activeStrokeRef = useRef<DrawingStroke | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateSize = () => {
      const { width, height } = container.getBoundingClientRect()
      const side = Math.floor(Math.min(width, height))
      setDisplaySize(Math.max(120, side))
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    renderDrawingToCanvas(ctx, data)
  }, [data])

  const appendPoint = useCallback(
    (point: [number, number]) => {
      const stroke = activeStrokeRef.current
      if (!stroke) return
      const last = stroke.points[stroke.points.length - 1]
      if (last && last[0] === point[0] && last[1] === point[1]) return
      stroke.points.push(point)
      onChange({
        ...data,
        strokes: [...data.strokes.slice(0, -1), { ...stroke, points: [...stroke.points] }],
      })
    },
    [data, onChange]
  )

  const startStroke = useCallback(
    (point: [number, number]) => {
      if (disabled) return
      drawingRef.current = true
      const stroke: DrawingStroke = {
        tool,
        size: tool === "eraser" ? 12 : 2,
        points: [point],
      }
      activeStrokeRef.current = stroke
      onChange({ ...data, strokes: [...data.strokes, stroke] })
    },
    [data, disabled, onChange, tool]
  )

  const endStroke = useCallback(() => {
    drawingRef.current = false
    activeStrokeRef.current = null
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.setPointerCapture(e.pointerId)
      startStroke(clientPoint(canvas, e.clientX, e.clientY))
    },
    [startStroke]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      appendPoint(clientPoint(canvas, e.clientX, e.clientY))
    },
    [appendPoint]
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return
      e.preventDefault()
      const canvas = canvasRef.current
      if (canvas?.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId)
      }
      endStroke()
    },
    [endStroke]
  )

  const deleteAll = useCallback(() => {
    if (disabled || !drawingHasContent(data)) return
    if (!confirm("Clear the entire drawing? This cannot be undone.")) return
    onChange(emptyDrawing())
  }, [data, disabled, onChange])

  const canDeleteAll = drawingHasContent(data)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap gap-2">
        <button
          type="button"
          className={`btn btn-xs ${tool === "pen" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setTool("pen")}
          disabled={disabled}
        >
          Pen
        </button>
        <button
          type="button"
          className={`btn btn-xs ${tool === "eraser" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setTool("eraser")}
          disabled={disabled}
        >
          Eraser
        </button>
        <button
          type="button"
          className="btn btn-xs btn-error btn-outline"
          onClick={deleteAll}
          disabled={disabled || !canDeleteAll}
        >
          Delete all
        </button>
      </div>
      <div
        ref={containerRef}
        className="flex min-h-0 flex-1 items-center justify-center"
      >
        <div className="rounded-box border border-base-300 bg-white p-1 dark:bg-white">
          <canvas
            ref={canvasRef}
            width={DRAWING_WIDTH}
            height={DRAWING_HEIGHT}
            className="block touch-none cursor-crosshair"
            style={{ width: displaySize, height: displaySize }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>
      </div>
    </div>
  )
}
