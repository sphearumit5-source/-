
import { useCallback, useEffect, useRef, useState } from 'react'

export interface CameraDevice {
  deviceId: string
  label: string
}

type CameraFacing = 'user' | 'environment'

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const deviceIdRef = useRef('')
  const facingRef = useRef<CameraFacing>('user')
  const startingRef = useRef(false)

  const [active, setActive] = useState(false)
  const [error, setError] = useState('')
  const [devices, setDevices] = useState<CameraDevice[]>([])
  const [deviceId, setDeviceId] = useState('')

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return

    try {
      const all = await navigator.mediaDevices.enumerateDevices()

      setDevices(
        all
          .filter((item) => item.kind === 'videoinput')
          .map((item, index) => ({
            deviceId: item.deviceId,
            label: item.label || `កាមេរ៉ា ${index + 1}`,
          })),
      )
    } catch {
      setDevices([])
    }
  }, [])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
    }

    setActive(false)
  }, [])

  const start = useCallback(
    async (
      preferredDeviceId?: string,
      facing: CameraFacing = facingRef.current,
    ) => {
      if (startingRef.current) return

      startingRef.current = true
      setError('')

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            'កម្មវិធីរុករកនេះមិនអាចប្រើកាមេរ៉ាបានទេ។ សូមប្រើ HTTPS ឬ localhost។',
          )
        }

        // បិទ stream ចាស់មុនបើកកាមេរ៉ាថ្មី
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        setActive(false)

        const videoConstraints: MediaTrackConstraints = preferredDeviceId
          ? {
              deviceId: { exact: preferredDeviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30, max: 30 },
            }
          : {
              facingMode: { ideal: facing },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30, max: 30 },
            }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        })

        streamRef.current = stream

        const track = stream.getVideoTracks()[0]
        const settings = track?.getSettings()
        const actualDeviceId = settings?.deviceId ?? preferredDeviceId ?? ''

        deviceIdRef.current = actualDeviceId
        facingRef.current = facing
        setDeviceId(actualDeviceId)

        const video = videoRef.current

        if (video) {
          video.muted = true
          video.autoplay = true
          video.playsInline = true
          video.srcObject = stream
          await video.play()
        }

        setActive(true)
        await refreshDevices()
      } catch (cameraError) {
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null

        if (videoRef.current) {
          videoRef.current.srcObject = null
        }

        setActive(false)

        if (cameraError instanceof Error && cameraError.message.startsWith('កម្មវិធីរុករក')) {
          setError(cameraError.message)
        } else {
          const name =
            cameraError instanceof DOMException
              ? cameraError.name
              : ''

          if (name === 'NotAllowedError') {
            setError('សូមអនុញ្ញាតឱ្យប្រើកាមេរ៉ា ក្នុង Browser Settings។')
          } else if (name === 'NotFoundError') {
            setError('មិនមានកាមេរ៉ាភ្ជាប់ទេ។')
          } else if (name === 'NotReadableError') {
            setError('កាមេរ៉ាកំពុងប្រើដោយកម្មវិធីផ្សេង។ សូមបិទកម្មវិធីនោះ។')
          } else if (name === 'OverconstrainedError') {
            setError('កាមេរ៉ាមិនអាចប្រើការកំណត់ដែលបានស្នើសុំទេ។ សូមសាកល្បងម្ដងទៀត។')
          } else {
            setError('មិនអាចបើកកាមេរ៉ាបានទេ។ សូមពិនិត្យការអនុញ្ញាត និងឧបករណ៍។')
          }
        }
      } finally {
        startingRef.current = false
      }
    },
    [refreshDevices],
  )

  const switchDevice = useCallback(
    async (nextDeviceId: string) => {
      if (!nextDeviceId) return

      deviceIdRef.current = nextDeviceId
      await start(nextDeviceId, facingRef.current)
    },
    [start],
  )

  const switchFacing = useCallback(
    async (facing: CameraFacing) => {
      facingRef.current = facing

      // បើកតាម facingMode ដើម្បីឱ្យ Browser ជ្រើសកាមេរ៉ាត្រឹមត្រូវ
      deviceIdRef.current = ''
      await start(undefined, facing)
    },
    [start],
  )

  const capture = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current

      if (
        !video ||
        !streamRef.current ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        reject(new Error('កាមេរ៉ាមិនទាន់រួចរាល់ទេ។ សូមរង់ចាំបន្តិច។'))
        return
      }

      const canvas = document.createElement('canvas')

      // ប្រើ Resolution ពិតពីកាមេរ៉ា មិនពង្រីករូបដោយសិប្បនិម្មិត
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const context = canvas.getContext('2d')

      if (!context) {
        reject(new Error('មិនអាចថតរូបពីកាមេរ៉ាបានទេ។'))
        return
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('មិនអាចបង្កើតរូបភាពបានទេ។'))
          }
        },
        'image/jpeg',
        0.92,
      )
    })
  }, [])

  useEffect(() => {
    const onChange = () => {
      void refreshDevices()
    }

    navigator.mediaDevices?.addEventListener?.('devicechange', onChange)

    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', onChange)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [refreshDevices])

  return {
    videoRef,
    active,
    error,
    devices,
    deviceId,
    start,
    stop,
    switchDevice,
    switchFacing,
    capture,
  }
}
