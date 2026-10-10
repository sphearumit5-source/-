import { useCallback, useEffect, useRef, useState } from 'react'
import { attendanceApi } from '../services/api'

interface UseFaceAutoScanOptions {
  active: boolean
  enabled: boolean
  capture: () => Promise<Blob>
  onSubmit: (frame: Blob) => Promise<void>
  intervalMs?: number
  requiredFrames?: number
  cooldownMs?: number
}

export function useFaceAutoScan({
  active,
  enabled,
  capture,
  onSubmit,
  intervalMs = 350,
  requiredFrames = 1,
  cooldownMs = 3000,
}: UseFaceAutoScanOptions) {
  const [guidance, setGuidance] = useState(
    'សូមដាក់ផ្ទៃមុខចំកណ្តាលស៊ុម…'
  )
  const [centered, setCentered] = useState(false)
  const [progress, setProgress] = useState(0)
  const [locked, setLocked] = useState(false)

  const stableRef = useRef(0)
  const busyRef = useRef(false)
  const lockedUntilRef = useRef(0)
  const mountedRef = useRef(false)

  const running = active && enabled

  const reset = useCallback(() => {
    stableRef.current = 0
    setProgress(0)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!running) {
      stableRef.current = 0
      lockedUntilRef.current = 0
      setProgress(0)
      setCentered(false)
      setLocked(false)
      return
    }

    let cancelled = false
    let timer: number | undefined

    const scheduleNext = (delay: number) => {
      if (cancelled) return
      timer = window.setTimeout(() => {
        void scan()
      }, Math.max(80, delay))
    }

    const scan = async (): Promise<void> => {
      if (cancelled || !mountedRef.current) return

      // Prevent overlapping camera capture requests
      if (busyRef.current) {
        scheduleNext(intervalMs)
        return
      }

      const remainingCooldown = lockedUntilRef.current - Date.now()
      if (remainingCooldown > 0) {
        scheduleNext(Math.max(intervalMs, remainingCooldown))
        return
      }

      if (lockedUntilRef.current !== 0) {
        lockedUntilRef.current = 0
        setLocked(false)
      }

      busyRef.current = true

      try {
        const frame = await capture()
        if (cancelled || !mountedRef.current) return

        const result = await attendanceApi.detectFace(frame)
        if (cancelled || !mountedRef.current) return

        setGuidance(result.guidance)
        setCentered(result.centered)

        if (!result.ready) {
          stableRef.current = 0
          setProgress(0)
          return
        }

        stableRef.current += 1
        const neededFrames = Math.max(1, Math.floor(requiredFrames))

        setProgress(Math.min(stableRef.current / neededFrames, 1))

        if (stableRef.current < neededFrames) {
          return
        }

        // Lock and trigger submission immediately
        lockedUntilRef.current = Date.now() + cooldownMs
        setLocked(true)

        // Haptic feedback on mobile if supported
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([60, 40, 60])
          } catch {
            // ignore
          }
        }

        stableRef.current = 0
        setProgress(0)

        try {
          await onSubmit(frame)
        } catch {
          // Page handles submission error
        }
      } catch {
        // Temporary capture or network glitch, retry
      } finally {
        busyRef.current = false

        if (!cancelled && mountedRef.current) {
          const remaining = lockedUntilRef.current - Date.now()
          scheduleNext(remaining > 0 ? Math.max(intervalMs, remaining) : intervalMs)
        }
      }
    }

    void scan()

    return () => {
      cancelled = true
      if (timer !== undefined) {
        window.clearTimeout(timer)
      }
    }
  }, [running, capture, onSubmit, intervalMs, requiredFrames, cooldownMs])

  return {
    guidance,
    centered,
    progress,
    locked,
    running,
    reset,
  }
}
