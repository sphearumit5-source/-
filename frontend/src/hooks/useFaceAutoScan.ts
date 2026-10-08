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
  intervalMs = 800,
  requiredFrames = 2,
  cooldownMs = 4000,
}: UseFaceAutoScanOptions) {
  const [guidance, setGuidance] = useState('សូមដាក់មុខនៅកណ្ដាលស៊ុម ហើយរក្សាឱ្យនៅស្ងៀម។')
  const [centered, setCentered] = useState(false)
  const [progress, setProgress] = useState(0)
  const [locked, setLocked] = useState(false)

  const stableRef = useRef(0)
  const busyRef = useRef(false)
  const lockedRef = useRef(false)
  const mountedRef = useRef(true)

  const running = active && enabled

  const reset = useCallback(() => {
    stableRef.current = 0
    setProgress(0)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!running) {
      busyRef.current = false
      lockedRef.current = false
      setLocked(false)
      stableRef.current = 0
      setProgress(0)
      return
    }

    const timer = window.setInterval(async () => {
      if (busyRef.current || lockedRef.current) return
      busyRef.current = true
      try {
        const frame = await capture()
        const result = await attendanceApi.detectFace(frame)
        if (!mountedRef.current) return
        setGuidance(result.guidance)
        setCentered(result.centered)
        if (!result.ready) {
          stableRef.current = 0
          setProgress(0)
          return
        }
        stableRef.current += 1
        setProgress(Math.min(stableRef.current / requiredFrames, 1))
        if (stableRef.current >= requiredFrames) {
          lockedRef.current = true
          setLocked(true)
          stableRef.current = 0
          setProgress(0)
          try {
            await onSubmit(frame)
          } catch {
            /* page surfaces the error message */
          }
          if (!mountedRef.current) return
          window.setTimeout(() => {
            if (!mountedRef.current) return
            lockedRef.current = false
            setLocked(false)
          }, cooldownMs)
        }
      } catch {
        /* transient detection error; next tick retries */
      } finally {
        busyRef.current = false
      }
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [running, capture, onSubmit, intervalMs, requiredFrames, cooldownMs])

  return { guidance, centered, progress, locked, running, reset }
}
