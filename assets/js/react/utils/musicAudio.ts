import {
  DEFAULT_TEMPO,
  type MusicScore,
  parseMusicPayload,
  parseScore,
  scoreToNoteList,
} from "./musicScore"

let audioCtxSingleton: AudioContext | null = null

export function getAudioContext(): AudioContext {
  if (audioCtxSingleton) return audioCtxSingleton
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  audioCtxSingleton = new Ctx()
  return audioCtxSingleton
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

function playToneAt(ctx: AudioContext, hz: number, start: number, durationSec: number, gainNode: GainNode) {
  const osc = ctx.createOscillator()
  osc.type = "sine"
  osc.frequency.value = hz
  osc.connect(gainNode)
  const attack = 0.01
  const release = 0.03
  gainNode.gain.setValueAtTime(0, start)
  gainNode.gain.linearRampToValueAtTime(0.22, start + attack)
  gainNode.gain.linearRampToValueAtTime(0, start + Math.max(attack, durationSec - release))
  osc.start(start)
  osc.stop(start + durationSec)
  return osc
}

export function playNotePreview(ctx: AudioContext, note: string, durationMs = 180): void {
  const hz = noteToHz(note)
  if (!hz) return
  const gain = ctx.createGain()
  gain.gain.value = 0
  gain.connect(ctx.destination)
  const start = ctx.currentTime + 0.02
  const osc = playToneAt(ctx, hz, start, durationMs / 1000, gain)
  window.setTimeout(() => {
    try {
      osc.disconnect()
    } catch {
      // ignore
    }
    try {
      gain.disconnect()
    } catch {
      // ignore
    }
  }, durationMs + 30)
}

function scheduleSequential(
  ctx: AudioContext,
  tempo: number,
  notes: string[]
): PlayHandle {
  const beatMs = 60000 / tempo
  const noteMs = Math.max(90, Math.min(600, beatMs / 2))
  const gain = ctx.createGain()
  gain.gain.value = 0
  gain.connect(ctx.destination)

  const oscillators: OscillatorNode[] = []
  const now = ctx.currentTime
  let t = now + 0.02

  for (const n of notes) {
    const hz = noteToHz(n)
    if (!hz) {
      t += noteMs / 1000
      continue
    }
    oscillators.push(playToneAt(ctx, hz, t, noteMs / 1000, gain))
    t += noteMs / 1000
  }

  return makeStopHandle(oscillators, gain, Math.max(50, (t - now) * 1000))
}

function scheduleGrid(ctx: AudioContext, score: MusicScore, onStep?: (step: number) => void): PlayHandle {
  const beatMs = 60000 / score.tempo
  const stepMs = Math.max(100, Math.min(800, beatMs / 2))
  const gain = ctx.createGain()
  gain.gain.value = 0
  gain.connect(ctx.destination)

  const oscillators: OscillatorNode[] = []
  const now = ctx.currentTime
  let t = now + 0.02
  const timers: number[] = []

  for (let step = 0; step < score.steps; step++) {
    const stepStart = t
    const active = score.rows.filter((row) => row.hits[step])
    if (active.length > 0) {
      const timer = window.setTimeout(() => onStep?.(step), (stepStart - now) * 1000)
      timers.push(timer)
      for (const row of active) {
        const hz = noteToHz(row.note)
        if (!hz) continue
        oscillators.push(playToneAt(ctx, hz, stepStart, stepMs / 1000, gain))
      }
    }
    t += stepMs / 1000
  }

  const handle = makeStopHandle(oscillators, gain, Math.max(50, (t - now) * 1000))
  const origStop = handle.stop
  return {
    stop: () => {
      for (const id of timers) window.clearTimeout(id)
      onStep?.(-1)
      origStop()
    },
    done: handle.done,
  }
}

function makeStopHandle(oscillators: OscillatorNode[], gain: GainNode, totalMs: number): PlayHandle {
  let stopped = false
  let resolveDone: (() => void) | null = null
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve
    window.setTimeout(() => {
      if (!stopped) resolve()
    }, totalMs + 30)
  })

  return {
    stop: () => {
      if (stopped) return
      stopped = true
      for (const o of oscillators) {
        try {
          o.stop()
        } catch {
          // ignore
        }
        try {
          o.disconnect()
        } catch {
          // ignore
        }
      }
      try {
        gain.disconnect()
      } catch {
        // ignore
      }
      resolveDone?.()
    },
    done,
  }
}

export function playPayload(
  ctx: AudioContext,
  payload: string,
  onStep?: (step: number) => void
): PlayHandle {
  const trimmed = payload.trim()
  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>
      if (obj.version === 1 && Array.isArray(obj.rows)) {
        return scheduleGrid(ctx, parseScore(trimmed), onStep)
      }
    } catch {
      // fall through
    }
  }

  const parsed = parseMusicPayload(payload)
  const tempo = parsed.tempo > 0 ? parsed.tempo : DEFAULT_TEMPO
  const notes = parsed.notes.length > 0 ? parsed.notes : scoreToNoteList(parseScore(payload))
  return scheduleSequential(ctx, tempo, notes)
}
