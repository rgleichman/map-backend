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
  insertSoundtrackColumn,
  removeSoundtrackColumn,
  renderDrawingToCanvas,
  resizeSoundtrack,
} from "../../utils/drawingPayload"
import { playScoreStepReady } from "../../utils/musicAudio"
import { cloneScore, emptyScore, type MusicScore } from "../../utils/musicScore"
import { useDrawingFramePlayback } from "../../hooks/useDrawingFramePlayback"
import Button from "../ui/Button"
import ConfirmDialog from "../ui/ConfirmDialog"
import MusicPlayStopLabel from "../music/MusicPlayStopLabel"
import MusicSequencer from "../music/MusicSequencer"

type DrawingToolType = (typeof DrawingTool)[keyof typeof DrawingTool]

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

/** After inserting an empty column at `to`, copy hits from `from` into `to`. */
function copySoundtrackColumn(score: MusicScore, from: number, to: number): MusicScore {
  const next = cloneScore(score)
  if (from < 0 || to < 0 || from >= next.steps || to >= next.steps) return next
  for (const row of next.rows) {
    row.hits[to] = row.hits[from] === true
  }
  return next
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
      const width = container.clientWidth
      const height = container.clientHeight
      // Mobile: size to available width (square) so the canvas is wide and left-heavy.
      // Desktop: fit within the flex panel (min of width/height).
      const compact = window.matchMedia("(max-width: 639px)").matches
      // Leave room for the white frame padding around the canvas.
      const framePad = 10
      const side = compact
        ? Math.floor(width - framePad)
        : Math.floor(Math.min(width, height || width) - framePad)
      setDisplaySize(Math.max(120, side))
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(container)
    const mq = window.matchMedia("(max-width: 639px)")
    mq.addEventListener("change", updateSize)
    return () => {
      observer.disconnect()
      mq.removeEventListener("change", updateSize)
    }
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

  const selectFrame = useCallback(
    (index: number) => {
      if (playing) setPlaying(false)
      setActiveIndex(index)
      const soundtrack = data.soundtrack
      void playScoreStepReady(soundtrack, index)
    },
    [data.soundtrack, playing]
  )

  useDrawingFramePlayback({
    visualLoop: false,
    audioEnabled: playing && multiFrame,
    frameCount,
    setFrameIndex: setActiveIndex,
    soundtrack: data.soundtrack,
  })

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
    const insertAt = safeIndex + 1
    const frames = [
      ...data.frames.slice(0, insertAt),
      emptyFrame(),
      ...data.frames.slice(insertAt),
    ]
    onChange({
      ...data,
      frames,
      soundtrack: insertSoundtrackColumn(
        data.soundtrack ?? emptyScore(frameCount),
        insertAt
      ),
    })
    setActiveIndex(insertAt)
  }, [data, disabled, frameCount, onChange, playing, safeIndex])

  const duplicateFrame = useCallback(() => {
    if (disabled || playing || frameCount >= MAX_DRAWING_FRAMES) return
    const insertAt = safeIndex + 1
    const source = data.frames[safeIndex] ?? emptyFrame()
    const frames = [
      ...data.frames.slice(0, insertAt),
      cloneFrame(source),
      ...data.frames.slice(insertAt),
    ]
    const soundtrack = insertSoundtrackColumn(
      data.soundtrack ?? emptyScore(frameCount),
      insertAt
    )
    // Copy hits from source column into the new column
    const duplicated = copySoundtrackColumn(soundtrack, safeIndex, insertAt)
    onChange({ ...data, frames, soundtrack: duplicated })
    setActiveIndex(insertAt)
  }, [data, disabled, frameCount, onChange, playing, safeIndex])

  const deleteFrame = useCallback(() => {
    if (disabled || playing || frameCount <= 1) return
    const frames = data.frames.filter((_, i) => i !== safeIndex)
    onChange({
      ...data,
      frames,
      soundtrack: removeSoundtrackColumn(
        data.soundtrack ?? emptyScore(frameCount),
        safeIndex
      ),
    })
    setActiveIndex(Math.min(safeIndex, frames.length - 1))
  }, [data, disabled, frameCount, onChange, playing, safeIndex])

  const setSoundtrack = useCallback(
    (soundtrack: MusicScore) => {
      if (disabled || playing) return
      onChange({
        ...data,
        soundtrack: resizeSoundtrack(soundtrack, data.frames.length),
      })
    },
    [data, disabled, onChange, playing]
  )

  const togglePlay = useCallback(() => {
    if (frameCount < 2) return
    setPlaying((p) => !p)
  }, [frameCount])

  const canClearFrame = frameHasContent(activeFrame)
  const drawDisabled = disabled || playing

  return (
    <div className="flex flex-col gap-3 sm:min-h-0 sm:flex-1">
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

      <div className="flex shrink-0 flex-col gap-1.5">
        <div className="flex w-full min-w-0 items-center gap-1.5 overflow-x-auto py-0.5">
          {data.frames.map((_, i) => (
            <FrameThumb
              key={i}
              data={data}
              frameIndex={i}
              selected={i === safeIndex}
              onSelect={() => selectFrame(i)}
              disabled={disabled}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="px-1.5"
            onClick={addFrame}
            disabled={disabled || playing || frameCount >= MAX_DRAWING_FRAMES}
          >
            Add
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="px-1.5"
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
              className="px-1.5"
              onClick={deleteFrame}
              disabled={disabled || playing}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-base-content/70">
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

      <div className="flex min-h-0 flex-1 flex-col gap-3 sm:flex-row sm:items-stretch">
        {/*
          Mobile: left-aligned wide canvas; finger-width strip on the right is free of
          touch-none so users can scroll down to the soundtrack.
        */}
        <div className="flex w-full shrink-0 sm:min-h-0 sm:flex-1">
          <div
            ref={containerRef}
            className="flex min-w-0 flex-1 items-center justify-start sm:justify-center"
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
          <div className="w-11 shrink-0 sm:hidden" aria-hidden="true" />
        </div>

        <div className="flex min-h-0 min-w-0 flex-col rounded-box border border-base-300 bg-base-100 p-2 sm:max-h-none sm:flex-1 sm:overflow-y-auto sm:self-stretch">
          <MusicSequencer
            score={resizeSoundtrack(data.soundtrack ?? emptyScore(frameCount), frameCount)}
            onChange={setSoundtrack}
            disabled={disabled || playing}
            compact
            activeStep={safeIndex}
            stepHeaderLabel={(step) => `F${step + 1}`}
          />
        </div>
      </div>
    </div>
  )
}
