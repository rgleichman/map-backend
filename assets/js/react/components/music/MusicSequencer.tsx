import React, { useCallback, useEffect, useRef, useState } from "react"
import type { MusicScore } from "../../utils/musicScore"
import { cloneScore, serializeScore } from "../../utils/musicScore"
import { getAudioContext, playNotePreview, playPayload } from "../../utils/musicAudio"

type Props = {
  score: MusicScore
  onChange: (score: MusicScore) => void
  disabled?: boolean
}

const MAX_UNDO = 24

export default function MusicSequencer({ score, onChange, disabled = false }: Props) {
  const [activeStep, setActiveStep] = useState(-1)
  const [previewing, setPreviewing] = useState(false)
  const undoStack = useRef<MusicScore[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const playerRef = useRef<ReturnType<typeof playPayload> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      playerRef.current?.stop()
      playerRef.current = null
    }
  }, [])

  const pushUndo = useCallback((prev: MusicScore) => {
    undoStack.current = [...undoStack.current.slice(-(MAX_UNDO - 1)), cloneScore(prev)]
    setCanUndo(undoStack.current.length > 0)
  }, [])

  const applyChange = useCallback(
    (next: MusicScore, rememberUndo = true) => {
      if (rememberUndo) pushUndo(score)
      onChange(next)
    },
    [onChange, pushUndo, score]
  )

  const toggleCell = useCallback(
    (rowIdx: number, stepIdx: number) => {
      if (disabled) return
      const next = cloneScore(score)
      next.rows[rowIdx].hits[stepIdx] = !next.rows[rowIdx].hits[stepIdx]
      applyChange(next)
    },
    [applyChange, disabled, score]
  )

  const setTempo = useCallback(
    (tempo: number) => {
      const clamped = Math.min(220, Math.max(40, Math.round(tempo)))
      if (clamped === score.tempo) return
      applyChange({ ...cloneScore(score), tempo: clamped })
    },
    [applyChange, score]
  )

  const clearGrid = useCallback(() => {
    const next = cloneScore(score)
    for (const row of next.rows) {
      row.hits = row.hits.map(() => false)
    }
    applyChange(next)
  }, [applyChange, score])

  const undo = useCallback(() => {
    const prev = undoStack.current.pop()
    setCanUndo(undoStack.current.length > 0)
    if (!prev) return
    onChange(prev)
  }, [onChange])

  const previewNote = useCallback(async (note: string) => {
    const ctx = getAudioContext()
    if (ctx.state === "suspended") await ctx.resume()
    playNotePreview(ctx, note)
  }, [])

  const togglePreview = useCallback(async () => {
    if (previewing) {
      playerRef.current?.stop()
      playerRef.current = null
      setPreviewing(false)
      setActiveStep(-1)
      return
    }
    const ctx = getAudioContext()
    if (ctx.state === "suspended") await ctx.resume()
    const player = playPayload(ctx, serializeScore(score), (step) => {
      if (mountedRef.current) setActiveStep(step)
    })
    playerRef.current = player
    setPreviewing(true)
    void player.done.then(() => {
      if (!mountedRef.current) return
      playerRef.current = null
      setPreviewing(false)
      setActiveStep(-1)
    })
  }, [previewing, score])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="form-control w-28">
          <span className="label-text text-xs text-base-content/70">Tempo (BPM)</span>
          <input
            type="number"
            min={40}
            max={220}
            step={1}
            className="input input-bordered input-sm w-full"
            value={score.tempo}
            disabled={disabled}
            onChange={(e) => setTempo(Number(e.target.value))}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`btn btn-sm ${previewing ? "btn-secondary" : "btn-outline"}`}
            onClick={() => void togglePreview()}
            disabled={disabled}
          >
            {previewing ? "Stop" : "Preview"}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={undo}
            disabled={disabled || !canUndo}
          >
            Undo
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={clearGrid}
            disabled={disabled}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <div className="inline-block min-w-full space-y-1">
          <div className="flex gap-1 pl-[3.25rem]">
            {Array.from({ length: score.steps }, (_, step) => (
              <div
                key={`head-${step}`}
                className={`flex h-7 w-9 shrink-0 items-center justify-center text-[10px] font-medium tabular-nums ${activeStep === step ? "text-primary" : "text-base-content/50"
                  }`}
              >
                {step + 1}
              </div>
            ))}
          </div>

          {score.rows.map((row, rowIdx) => (
            <div key={row.note} className="flex gap-1 items-center">
              <button
                type="button"
                className="btn btn-ghost btn-xs h-9 min-h-9 w-[3.25rem] shrink-0 font-mono text-xs justify-start px-1"
                disabled={disabled}
                onClick={() => void previewNote(row.note)}
                title={`Preview ${row.note}`}
              >
                {row.note}
              </button>
              {row.hits.map((on, stepIdx) => (
                <button
                  key={`${row.note}-${stepIdx}`}
                  type="button"
                  data-sequencer-pad
                  aria-label={`${row.note} step ${stepIdx + 1}${on ? " on" : " off"}`}
                  aria-pressed={on}
                  disabled={disabled}
                  onClick={() => {
                    void previewNote(row.note)
                    toggleCell(rowIdx, stepIdx)
                  }}
                  className={[
                    "h-9 min-h-9 w-9 shrink-0 rounded-md border transition-all duration-150",
                    on
                      ? [
                        "bg-primary text-primary-content border-primary shadow-md shadow-primary/35",
                        activeStep === stepIdx
                          ? "ring-2 ring-secondary ring-offset-1 ring-offset-base-100 brightness-110"
                          : "hover:brightness-110",
                      ].join(" ")
                      : "border-base-300 bg-base-200/60 hover:bg-base-300/80 dark:bg-base-300/20",
                  ].join(" ")}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-base-content/60">
        Tap pads to hear notes. Toggle steps to build a pattern. Preview plays left to right.
      </p>
    </div>
  )
}
