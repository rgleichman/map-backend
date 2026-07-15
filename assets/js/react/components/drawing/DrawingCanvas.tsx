import React, { useCallback, useEffect, useRef, useState } from "react"
import type { DrawingData, DrawingStroke } from "../../utils/drawingPayload"
import {
  DRAWING_HEIGHT,
  DRAWING_WIDTH,
  DrawingTool,
  MAX_DRAWING_FRAMES,
  cloneFrame,
  emptyFrame,
  frameHasContent,
  renderDrawingToCanvas,
} from "../../utils/drawingPayload"
import Button from "../ui/Button"
import ConfirmDialog from "../ui/ConfirmDialog"
import MusicPlayStopLabel from "../music/MusicPlayStopLabel"

type DrawingToolType = (typeof DrawingTool)[keyof typeof DrawingTool]

const FPS_OPTIONS = [2, 4, 8] as const

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

function FrameThumb({
  data,
  frameIndex,
  selected,
  onSelect,
  disabled,
}: {
  data: DrawingData
  frameIndex: number
  selected: boolean
  onSelect: () => void
  disabled: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    renderDrawingToCanvas(ctx, data, { frameIndex, onionSkin: false })
  }, [data, frameIndex])

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-label={`Frame ${frameIndex + 1}`}
      aria-pressed={selected}
      className={[
        "shrink-0 rounded-md border p-0.5 bg-white dark:bg-white transition-colors",
        selected
          ? "border-primary ring-2 ring-primary/40"
          : "border-base-300 hover:border-base-content/40",
        disabled ? "opacity-50 pointer-events-none" : "cursor-pointer",
      ].join(" ")}
    >
      <canvas
        ref={canvasRef}
        width={DRAWING_WIDTH}
        height={DRAWING_HEIGHT}
        className="block rounded-sm"
        style={{ width: 40, height: 40 }}
        aria-hidden
      />
    </button>
  )
}

export default function DrawingCanvas({ data, onChange, disabled = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [tool, setTool] = useState<DrawingToolType>(DrawingTool.Pen)
  const [confirmClearFrame, setConfirmClearFrame] = useState(false)
  const [displaySize, setDisplaySize] = useState(DRAWING_WIDTH)
  const [activeIndex, setActiveIndex] = useState(0)
  const [onionSkin, setOnionSkin] = useState(true)
  const [playing, setPlaying] = useState(false)
  const drawingRef = useRef(false)
  const activeStrokeRef = useRef<DrawingStroke | null>(null)
  const activeIndexRef = useRef(0)
  activeIndexRef.current = activeIndex

  const frameCount = data.frames.length
  const safeIndex = Math.max(0, Math.min(frameCount - 1, activeIndex))
  const activeFrame = data.frames[safeIndex] ?? emptyFrame()
  const multiFrame = frameCount > 1

  useEffect(() => {
    if (activeIndex >= frameCount) {
      setActiveIndex(Math.max(0, frameCount - 1))
    }
  }, [activeIndex, frameCount])

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
    renderDrawingToCanvas(ctx, data, {
      frameIndex: safeIndex,
      onionSkin: onionSkin && multiFrame && !playing,
    })
  }, [data, safeIndex, onionSkin, multiFrame, playing])

  useEffect(() => {
    if (!playing || frameCount < 2) return
    const ms = Math.max(50, Math.round(1000 / Math.max(1, data.fps)))
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % frameCount)
    }, ms)
    return () => window.clearInterval(id)
  }, [playing, frameCount, data.fps])

  const updateActiveStrokes = useCallback(
    (strokes: DrawingStroke[]) => {
      const index = activeIndexRef.current
      const frames = data.frames.map((frame, i) =>
        i === index ? { strokes } : frame
      )
      onChange({ ...data, frames })
    },
    [data, onChange]
  )

  const appendPoint = useCallback(
    (point: [number, number]) => {
      const stroke = activeStrokeRef.current
      if (!stroke) return
      const last = stroke.points[stroke.points.length - 1]
      if (last && last[0] === point[0] && last[1] === point[1]) return
      stroke.points.push(point)
      const index = activeIndexRef.current
      const current = data.frames[index]?.strokes ?? []
      updateActiveStrokes([
        ...current.slice(0, -1),
        { ...stroke, points: [...stroke.points] },
      ])
    },
    [data.frames, updateActiveStrokes]
  )

  const startStroke = useCallback(
    (point: [number, number]) => {
      if (disabled || playing) return
      drawingRef.current = true
      const stroke: DrawingStroke = {
        tool,
        size: tool === DrawingTool.Eraser ? 12 : 2,
        points: [point],
      }
      activeStrokeRef.current = stroke
      const index = activeIndexRef.current
      const current = data.frames[index]?.strokes ?? []
      updateActiveStrokes([...current, stroke])
    },
    [data.frames, disabled, playing, tool, updateActiveStrokes]
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

  const clearFrame = useCallback(() => {
    if (disabled || playing || !frameHasContent(activeFrame)) return
    setConfirmClearFrame(true)
  }, [activeFrame, disabled, playing])

  const confirmClearFrameDrawing = useCallback(() => {
    updateActiveStrokes([])
    setConfirmClearFrame(false)
  }, [updateActiveStrokes])

  const addFrame = useCallback(() => {
    if (disabled || playing || frameCount >= MAX_DRAWING_FRAMES) return
    const frames = [
      ...data.frames.slice(0, safeIndex + 1),
      emptyFrame(),
      ...data.frames.slice(safeIndex + 1),
    ]
    onChange({ ...data, frames })
    setActiveIndex(safeIndex + 1)
  }, [data, disabled, frameCount, onChange, playing, safeIndex])

  const duplicateFrame = useCallback(() => {
    if (disabled || playing || frameCount >= MAX_DRAWING_FRAMES) return
    const source = data.frames[safeIndex] ?? emptyFrame()
    const frames = [
      ...data.frames.slice(0, safeIndex + 1),
      cloneFrame(source),
      ...data.frames.slice(safeIndex + 1),
    ]
    onChange({ ...data, frames })
    setActiveIndex(safeIndex + 1)
  }, [data, disabled, frameCount, onChange, playing, safeIndex])

  const deleteFrame = useCallback(() => {
    if (disabled || playing || frameCount <= 1) return
    const frames = data.frames.filter((_, i) => i !== safeIndex)
    onChange({ ...data, frames })
    setActiveIndex(Math.min(safeIndex, frames.length - 1))
  }, [data, disabled, frameCount, onChange, playing, safeIndex])

  const setFps = useCallback(
    (fps: number) => {
      if (disabled) return
      onChange({ ...data, fps })
    },
    [data, disabled, onChange]
  )

  const togglePlay = useCallback(() => {
    if (frameCount < 2) return
    setPlaying((p) => !p)
  }, [frameCount])

  const canClearFrame = frameHasContent(activeFrame)
  const drawDisabled = disabled || playing

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap gap-2 items-center">
        <Button
          type="button"
          size="xs"
          variant={tool === DrawingTool.Pen ? "primary" : "ghost"}
          onClick={() => setTool(DrawingTool.Pen)}
          disabled={drawDisabled}
        >
          Pen
        </Button>
        <Button
          type="button"
          size="xs"
          variant={tool === DrawingTool.Eraser ? "primary" : "ghost"}
          onClick={() => setTool(DrawingTool.Eraser)}
          disabled={drawDisabled}
        >
          Eraser
        </Button>
        <Button
          type="button"
          size="xs"
          variant="dangerOutline"
          onClick={clearFrame}
          disabled={drawDisabled || !canClearFrame}
        >
          Clear frame
        </Button>
        {multiFrame ? (
          <Button
            type="button"
            size="xs"
            variant={onionSkin ? "primary" : "ghost"}
            onClick={() => setOnionSkin((v) => !v)}
            disabled={disabled || playing}
            aria-pressed={onionSkin}
          >
            Onion skin
          </Button>
        ) : null}
        {multiFrame ? (
          <Button
            type="button"
            size="xs"
            variant="action"
            onClick={togglePlay}
            disabled={disabled}
          >
            <MusicPlayStopLabel playing={playing} />
          </Button>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5">
          {data.frames.map((_, i) => (
            <FrameThumb
              key={i}
              data={data}
              frameIndex={i}
              selected={i === safeIndex}
              onSelect={() => {
                if (playing) setPlaying(false)
                setActiveIndex(i)
              }}
              disabled={disabled}
            />
          ))}
        </div>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          onClick={addFrame}
          disabled={disabled || playing || frameCount >= MAX_DRAWING_FRAMES}
        >
          Add frame
        </Button>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          onClick={duplicateFrame}
          disabled={disabled || playing || frameCount >= MAX_DRAWING_FRAMES}
        >
          Duplicate
        </Button>
        {multiFrame ? (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={deleteFrame}
            disabled={disabled || playing}
          >
            Remove frame
          </Button>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-base-content/70">
        <span className="font-medium text-base-content/80">FPS</span>
        {FPS_OPTIONS.map((fps) => (
          <Button
            key={fps}
            type="button"
            size="xs"
            variant={data.fps === fps ? "primary" : "ghost"}
            onClick={() => setFps(fps)}
            disabled={disabled}
          >
            {fps}
          </Button>
        ))}
        <span className="ml-auto tabular-nums">
          Frame {safeIndex + 1}/{frameCount}
        </span>
      </div>

      <ConfirmDialog
        open={confirmClearFrame}
        title="Clear this frame?"
        body="Strokes on this frame will be removed. This cannot be undone."
        confirmLabel="Clear frame"
        onCancel={() => setConfirmClearFrame(false)}
        onConfirm={confirmClearFrameDrawing}
      />

      <div
        ref={containerRef}
        className="flex min-h-0 flex-1 items-center justify-center"
      >
        <div className="rounded-box border border-base-300 bg-white p-1 dark:bg-white">
          <canvas
            ref={canvasRef}
            width={DRAWING_WIDTH}
            height={DRAWING_HEIGHT}
            className={[
              "block touch-none",
              drawDisabled ? "cursor-default" : "cursor-crosshair",
            ].join(" ")}
            style={{ width: displaySize, height: displaySize }}
            onPointerDown={drawDisabled ? undefined : onPointerDown}
            onPointerMove={drawDisabled ? undefined : onPointerMove}
            onPointerUp={drawDisabled ? undefined : onPointerUp}
            onPointerLeave={drawDisabled ? undefined : onPointerUp}
            onPointerCancel={drawDisabled ? undefined : onPointerUp}
          />
        </div>
      </div>
    </div>
  )
}
