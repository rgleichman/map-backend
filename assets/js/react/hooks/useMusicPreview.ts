import { useCallback, useEffect, useRef, useState } from "react"
import { playPayload, resumeAudioContext } from "../utils/musicAudio"

type Options = {
  onStep?: (step: number) => void
  onStopped?: () => void
  /** When true, restart playback when the score finishes until stop()/unmount. */
  loop?: boolean
}

type ToggleOptions = {
  /** Show loading state while resolving payload (e.g. blob fetch). */
  withLoading?: boolean
}

export function useMusicPreview(options?: Options) {
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const playerRef = useRef<ReturnType<typeof playPayload> | null>(null)
  const mountedRef = useRef(true)
  const wantPlayRef = useRef(false)
  const onStepRef = useRef(options?.onStep)
  const onStoppedRef = useRef(options?.onStopped)
  const loopRef = useRef(options?.loop === true)
  onStepRef.current = options?.onStep
  onStoppedRef.current = options?.onStopped
  loopRef.current = options?.loop === true

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      wantPlayRef.current = false
      playerRef.current?.stop()
      playerRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    wantPlayRef.current = false
    playerRef.current?.stop()
    playerRef.current = null
    if (mountedRef.current) {
      setPlaying(false)
      onStoppedRef.current?.()
    }
  }, [])

  const startPlayback = useCallback(async (payload: string) => {
    const ctx = await resumeAudioContext()
    if (!mountedRef.current) return

    const run = () => {
      if (!mountedRef.current || !wantPlayRef.current) return
      const player = playPayload(ctx, payload, (step) => {
        if (mountedRef.current) onStepRef.current?.(step)
      })
      playerRef.current = player
      setPlaying(true)
      void player.done.then(() => {
        if (!mountedRef.current) return
        if (playerRef.current !== player) return
        playerRef.current = null
        if (wantPlayRef.current && loopRef.current) {
          run()
          return
        }
        wantPlayRef.current = false
        setPlaying(false)
        onStoppedRef.current?.()
      })
    }

    wantPlayRef.current = true
    playerRef.current?.stop()
    playerRef.current = null
    run()
  }, [])

  const toggle = useCallback(
    async (resolvePayload: () => Promise<string> | string, toggleOptions?: ToggleOptions) => {
      if (playing) {
        stop()
        return
      }
      setError(null)
      if (toggleOptions?.withLoading) setLoading(true)
      try {
        const payload = await Promise.resolve(resolvePayload())
        await startPlayback(payload)
      } catch (e) {
        if (mountedRef.current) {
          setError(e instanceof Error ? e.message : "Failed to play.")
        }
      } finally {
        if (mountedRef.current && toggleOptions?.withLoading) setLoading(false)
      }
    },
    [playing, startPlayback, stop]
  )

  return { playing, loading, error, toggle, stop, startPlayback }
}
