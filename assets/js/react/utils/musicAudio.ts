import {
  type MusicScore,
  parseScore,
  scoreAtStep,
  singleNoteScore,
} from "./musicScore"

let audioCtxSingleton: AudioContext | null = null

export function getAudioContext(): AudioContext {
  if (audioCtxSingleton) return audioCtxSingleton
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  audioCtxSingleton = new Ctx()
  return audioCtxSingleton
}

/** Resume the shared AudioContext if the browser suspended it (autoplay policy). */
export async function resumeAudioContext(): Promise<AudioContext> {
  const ctx = getAudioContext()
  if (ctx.state === "suspended") await ctx.resume()
  return ctx
}

export function noteToHz(note: string): number | null {
  const m = note.trim().match(/^([A-Ga-g])([#b]?)(-?\d+)$/)
  if (!m) return null
  const letter = m[1].toUpperCase()
  const accidental = m[2]
  const octave = parseInt(m[3], 10)
  const semitoneBase: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  let semitone = semitoneBase[letter] ?? 0
  if (accidental === "#") semitone += 1
  if (accidental === "b") semitone -= 1
  const midi = (octave + 1) * 12 + semitone
  return 440 * Math.pow(2, (midi - 69) / 12)
}

type PlayHandle = { stop(): void; done: Promise<void> }

const MASTER_GAIN = 0.22
const ATTACK_SEC = 0.012
const RELEASE_SEC = 0.045
/** Never ramp an AudioParam to exact 0 (exponentialRamp forbids it; linear to 0 can click). */
const SILENCE = 0.0001
const STOP_FADE_SEC = 0.025
/** `onStep` value when playback is stopped (not a real column). */
export const PLAYBACK_STOPPED_STEP = -1

function softNormalizePeak(voiceCount: number): number {
  return 1 / Math.sqrt(Math.max(1, voiceCount))
}

function hzForStep(score: MusicScore, step: number): number[] {
  const out: number[] = []
  for (const row of score.rows) {
    if (!row.hits[step]) continue
    const hz = noteToHz(row.note)
    if (hz) out.push(hz)
  }
  return out
}

/**
 * One oscillator with its own envelope into a constant master gain.
 * Per-note envelopes avoid shared-gain automation fighting (clicks between steps).
 */
function playToneAt(
  ctx: AudioContext,
  hz: number,
  start: number,
  durationSec: number,
  master: GainNode,
  peak = 1
): { osc: OscillatorNode; env: GainNode } {
  const osc = ctx.createOscillator()
  const env = ctx.createGain()
  osc.type = "sine"
  osc.frequency.value = hz
  osc.connect(env)
  env.connect(master)

  const peakLevel = Math.max(SILENCE, peak)
  const attack = Math.min(ATTACK_SEC, durationSec * 0.25)
  const release = Math.min(RELEASE_SEC, durationSec * 0.4)
  const attackEnd = start + attack
  const releaseStart = Math.max(attackEnd, start + durationSec - release)
  const end = start + durationSec

  env.gain.setValueAtTime(SILENCE, start)
  env.gain.exponentialRampToValueAtTime(peakLevel, attackEnd)
  env.gain.setValueAtTime(peakLevel, releaseStart)
  env.gain.exponentialRampToValueAtTime(SILENCE, end)

  osc.start(start)
  osc.stop(end + 0.02)
  return { osc, env }
}

function disconnectNodes(nodes: AudioNode[]) {
  for (const node of nodes) {
    try {
      node.disconnect()
    } catch {
      // ignore
    }
  }
}

function makeStopHandle(
  ctx: AudioContext,
  oscillators: OscillatorNode[],
  envs: GainNode[],
  master: GainNode,
  totalMs: number
): PlayHandle {
  let stopped = false
  let resolveDone: (() => void) | null = null
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve
    window.setTimeout(() => {
      if (!stopped) resolve()
    }, totalMs + 40)
  })

  const tearDown = () => {
    for (const o of oscillators) {
      try {
        o.stop()
      } catch {
        // ignore
      }
    }
    disconnectNodes([...oscillators, ...envs, master])
    resolveDone?.()
  }

  return {
    stop: () => {
      if (stopped) return
      stopped = true
      const now = ctx.currentTime
      try {
        master.gain.cancelScheduledValues(now)
        master.gain.setValueAtTime(Math.max(SILENCE, master.gain.value), now)
        master.gain.linearRampToValueAtTime(SILENCE, now + STOP_FADE_SEC)
      } catch {
        // ignore
      }
      window.setTimeout(tearDown, STOP_FADE_SEC * 1000 + 5)
    },
    done,
  }
}

/** Step duration used by scheduleGrid — exported so silent drawing loops stay in sync. */
export function scoreStepIntervalMs(tempo: number): number {
  const beatMs = 60000 / Math.max(1, tempo)
  return Math.max(100, Math.min(800, beatMs / 2))
}

/** Canonical scheduled grid playback (tempo BPM, stoppable). */
function scheduleGrid(ctx: AudioContext, score: MusicScore, onStep?: (step: number) => void): PlayHandle {
  const stepMs = scoreStepIntervalMs(score.tempo)
  const stepSec = stepMs / 1000
  const master = ctx.createGain()
  master.gain.value = MASTER_GAIN
  master.connect(ctx.destination)

  const oscillators: OscillatorNode[] = []
  const envs: GainNode[] = []
  const now = ctx.currentTime
  let t = now + 0.02
  const timers: number[] = []

  for (let step = 0; step < score.steps; step++) {
    const stepStart = t
    // Always fire onStep so drawing frames advance on empty columns too.
    timers.push(window.setTimeout(() => onStep?.(step), (stepStart - now) * 1000))

    const sounding = hzForStep(score, step)
    const voicePeak = softNormalizePeak(sounding.length)
    for (const hz of sounding) {
      const { osc, env } = playToneAt(ctx, hz, stepStart, stepSec, master, voicePeak)
      oscillators.push(osc)
      envs.push(env)
    }
    t += stepSec
  }

  const handle = makeStopHandle(ctx, oscillators, envs, master, Math.max(50, (t - now) * 1000))
  const origStop = handle.stop
  return {
    stop: () => {
      for (const id of timers) window.clearTimeout(id)
      onStep?.(PLAYBACK_STOPPED_STEP)
      origStop()
    },
    done: handle.done,
  }
}

/** One-shot grid plays (pad preview / score column); soft-replaces prior one-shot. */
let oneShotPlayer: PlayHandle | null = null

function playOneShotGrid(ctx: AudioContext, score: MusicScore): void {
  oneShotPlayer?.stop()
  const handle = scheduleGrid(ctx, score)
  oneShotPlayer = handle
  void handle.done.then(() => {
    if (oneShotPlayer === handle) oneShotPlayer = null
  })
}

async function playOneShotReady(score: MusicScore): Promise<void> {
  const ctx = await resumeAudioContext()
  playOneShotGrid(ctx, score)
}

/** Pad / single-note preview — same voice as grid music. */
export async function playNotePreviewReady(note: string): Promise<void> {
  await playOneShotReady(singleNoteScore(note))
}

/** Play one soundtrack column via the same grid path as full music playback. */
export async function playScoreStepReady(score: MusicScore, stepIndex: number): Promise<void> {
  const sliced = scoreAtStep(score, stepIndex)
  if (!sliced) return
  await playOneShotReady(sliced)
}

export function playPayload(
  ctx: AudioContext,
  payload: string,
  onStep?: (step: number) => void
): PlayHandle {
  oneShotPlayer?.stop()
  oneShotPlayer = null
  return scheduleGrid(ctx, parseScore(payload), onStep)
}
