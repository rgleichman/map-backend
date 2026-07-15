import React, { useCallback, useRef, useState } from "react"
import type { MusicScore } from "../../utils/musicScore"
import { clampTempo, cloneScore, serializeScore } from "../../utils/musicScore"
import { PLAYBACK_STOPPED_STEP, playNotePreviewReady } from "../../utils/musicAudio"
import MusicPlayStopLabel from "./MusicPlayStopLabel"
import { useMusicPreview } from "../../hooks/useMusicPreview"
import Button from "../ui/Button"

type Props = {
  score: MusicScore
  onChange: (score: MusicScore) => void
  disabled?: boolean
  /** Compact layout for drawing soundtrack embedding (hides standalone play unless overridden). */
  compact?: boolean
  hidePreview?: boolean
  /** Controlled playhead highlight (`PLAYBACK_STOPPED_STEP` = none). When set, overrides internal preview step. */
  activeStep?: number
  stepHeaderLabel?: (step: number) => string
}

const MAX_UNDO = 24

export default function MusicSequencer({
  score,
  onChange,
  disabled = false,
  compact = false,
  hidePreview = false,
  activeStep: controlledActiveStep,
  stepHeaderLabel,
}: Props) {
  const [internalActiveStep, setInternalActiveStep] = useState(PLAYBACK_STOPPED_STEP)
  const [tempoInput, setTempoInput] = useState<string | null>(null)
  const undoStack = useRef<MusicScore[]>([])
  const [canUndo, setCanUndo] = useState(false)

  const hidePreviewBtn = compact || hidePreview
  const activeStep =
    controlledActiveStep !== undefined ? controlledActiveStep : internalActiveStep

  const { playing: previewing, toggle: togglePreview } = useMusicPreview({
    onStep: setInternalActiveStep,
    onStopped: () => setInternalActiveStep(PLAYBACK_STOPPED_STEP),
  })

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

  const commitTempo = useCallback(() => {
    const raw = tempoInput ?? String(score.tempo)
    setTempoInput(null)
    const parsed = parseInt(raw, 10)
    if (Number.isNaN(parsed)) return
    const clamped = clampTempo(parsed)
    if (clamped === score.tempo) return
    applyChange({ ...cloneScore(score), tempo: clamped })
  }, [applyChange, score, tempoInput])

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

  const previewNote = useCallback((note: string) => {
    void playNotePreviewReady(note)
  }, [])

  const onTogglePreview = useCallback(() => {
    void togglePreview(() => serializeScore(score))
  }, [score, togglePreview])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="form-control w-28">
          <span className="label-text text-xs text-base-content/70">Tempo (BPM)</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="input input-bordered input-sm w-full"
            value={tempoInput ?? String(score.tempo)}
            disabled={disabled}
            onChange={(e) => setTempoInput(e.target.value.replace(/[^\d]/g, ""))}
            onBlur={() => commitTempo()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                commitTempo()
              } else if (e.key === "Escape") {
                e.preventDefault()
                setTempoInput(null)
              }
            }}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {!hidePreviewBtn ? (
            <Button
              type="button"
              size="sm"
              variant="action"
              onClick={onTogglePreview}
              disabled={disabled}
            >
              <MusicPlayStopLabel playing={previewing} />
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="ghost" onClick={undo} disabled={disabled || !canUndo}>
            Undo
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={clearGrid} disabled={disabled}>
            Clear
          </Button>
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
                {stepHeaderLabel ? stepHeaderLabel(step) : step + 1}
              </div>
            ))}
          </div>

          {score.rows.map((row, rowIdx) => (
            <div key={row.note} className="flex gap-1 items-center">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-9 min-h-9 w-[3.25rem] font-mono justify-start"
                disabled={disabled}
                onClick={() => void previewNote(row.note)}
                title={`Preview ${row.note}`}
              >
                {row.note}
              </Button>
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
        {compact
          ? "Each column is a frame. Drawing Play syncs sound."
          : "Tap pads to hear notes. Toggle steps to build a pattern. Play runs left to right."}
      </p>
    </div>
  )
}
