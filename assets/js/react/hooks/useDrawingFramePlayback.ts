import { useEffect, type Dispatch, type SetStateAction } from "react"
import { PLAYBACK_STOPPED_STEP, scoreStepIntervalMs } from "../utils/musicAudio"
import { DEFAULT_TEMPO, serializeScore, type MusicScore } from "../utils/musicScore"
import { useMusicPreview } from "./useMusicPreview"

type Options = {
  /** Advance frames on a silent tempo interval (e.g. muted preview). */
  visualLoop: boolean
  /** Play full soundtrack via scheduleGrid and drive frames from onStep. */
  audioEnabled: boolean
  frameCount: number
  setFrameIndex: Dispatch<SetStateAction<number>>
  soundtrack: MusicScore | null | undefined
}

/**
 * Tempo-driven drawing playback.
 * Silent: interval at scoreStepIntervalMs. Audible: looping full-grid music path + onStep → frames.
 */
export function useDrawingFramePlayback({
  visualLoop,
  audioEnabled,
  frameCount,
  setFrameIndex,
  soundtrack,
}: Options): void {
  const tempo = soundtrack?.tempo ?? DEFAULT_TEMPO
  const { startPlayback, stop: stopAudio } = useMusicPreview({
    loop: true,
    onStep: (step) => {
      if (step === PLAYBACK_STOPPED_STEP) return
      setFrameIndex(step)
    },
  })

  const silentVisual = visualLoop && !audioEnabled && frameCount >= 2

  useEffect(() => {
    if (!silentVisual) return
    const ms = scoreStepIntervalMs(tempo)
    const id = window.setInterval(() => {
      setFrameIndex((i) => (i + 1) % frameCount)
    }, ms)
    return () => window.clearInterval(id)
  }, [silentVisual, tempo, frameCount, setFrameIndex])

  const scoreKey = soundtrack ? serializeScore(soundtrack) : ""

  useEffect(() => {
    if (!audioEnabled || !scoreKey || frameCount < 1) {
      stopAudio()
      return
    }
    void startPlayback(scoreKey)
    return () => stopAudio()
  }, [audioEnabled, scoreKey, frameCount, startPlayback, stopAudio])
}
