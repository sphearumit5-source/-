import { useCallback, useEffect, useRef, useState } from 'react'

export interface CameraDevice {
  deviceId: string
  label: string
  isVirtual?: boolean
}

export type CameraFacing = 'user' | 'environment'

// ស្វែងរក និងសម្គាល់ Virtual Camera (ដូចជា DroidCam, OBS, etc.) ដែលមិនមែនជាកាមេរ៉ាពិត
export function isVirtualCamera(label: string): boolean {
  if (!label) return false
  const lower = label.toLowerCase()
  return (
    lower.includes('droidcam') ||
    lower.includes('obs virtual') ||
    lower.includes('obs-camera') ||
    lower.includes('virtual') ||
    lower.includes('vmic') ||
    lower.includes('vmix') ||
    lower.includes('manycam') ||
    lower.includes('splitcam') ||
    lower.includes('iriun') ||
    lower.includes('epoccam') ||
    lower.includes('ndi') ||
    lower.includes('cyberlink') ||
    lower.includes('youcam') ||
    lower.includes('unity') ||
    lower.includes('ip camera') ||
    lower.includes('streamlabs')
  )
}

const PREFERRED_CAMERA_STORAGE_KEY = 'preferred_camera_device_id'

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
  const [facing, setFacing] = useState<CameraFacing>('user')

  const refreshDevices = useCallback(async (): Promise<CameraDevice[]> => {
    if (!navigator.mediaDevices?.enumerateDevices) return []
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      const formatted: CameraDevice[] = all
        .filter((item) => item.kind === 'videoinput')
        .map((item, index) => ({
          deviceId: item.deviceId,
          label: item.label || `កាមេរ៉ា ${index + 1}`,
          isVirtual: isVirtualCamera(item.label),
        }))

      // តម្រៀបយកកាមេរ៉ាពិត (Physical Webcam) មកមុខគេ ហើយរុញ Virtual Camera ទៅក្រោយ
      formatted.sort((a, b) => {
        if (a.isVirtual && !b.isVirtual) return 1
        if (!a.isVirtual && b.isVirtual) return -1
        return 0
      })

      setDevices(formatted)
      return formatted
    } catch {
      setDevices([])
      return []
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
      targetFacing: CameraFacing = facingRef.current
    ) => {
      if (startingRef.current) return
      startingRef.current = true
      setError('')

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            'កម្មវិធីរុករកនេះមិនអាចប្រើកាមេរ៉ាបានទេ។ សូមប្រើ HTTPS ឬ localhost។'
          )
        }

        // បិទ stream ចាស់មុនបើកកាមេរ៉ាថ្មី
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        setActive(false)

        // ពិនិត្យរកមើល Camera Device ID ដែលគួរប្រើ
        let chosenDeviceId =
          preferredDeviceId ||
          localStorage.getItem(PREFERRED_CAMERA_STORAGE_KEY) ||
          ''

        // ប្រសិនបើពុំទាន់មាន ឬ id ចាស់ជា virtual camera យើងស្វែងរកកាមេរ៉ាពិតជាមុនសិន
        try {
          const currentList = await navigator.mediaDevices.enumerateDevices()
          const videoInputs = currentList.filter((d) => d.kind === 'videoinput')

          // ប្រសិនបើ chosenDeviceId ជា virtual camera សូមសម្អាតវាចោល
          const targetObj = videoInputs.find((d) => d.deviceId === chosenDeviceId)
          if (targetObj && isVirtualCamera(targetObj.label)) {
            chosenDeviceId = ''
          }

          // ជ្រើសរើសកាមេរ៉ាពិត (កុំយក DroidCam ឬ Virtual Camera)
          if (!chosenDeviceId) {
            const physical = videoInputs.find((d) => d.label && !isVirtualCamera(d.label))
            if (physical) {
              chosenDeviceId = physical.deviceId
            }
          }
        } catch {
          // ignore
        }

        // សាកល្បងបើកកាមេរ៉ា
        let stream: MediaStream | null = null
        const attemptConstraints: MediaTrackConstraints[] = []

        if (chosenDeviceId) {
          attemptConstraints.push({
            deviceId: { exact: chosenDeviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          })
          attemptConstraints.push({
            deviceId: { exact: chosenDeviceId },
          })
        } else {
          attemptConstraints.push({
            facingMode: targetFacing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          })
          attemptConstraints.push({
            facingMode: { ideal: targetFacing },
          })
        }
        attemptConstraints.push({})

        for (const constraints of attemptConstraints) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: constraints,
              audio: false,
            })
            if (stream) break
          } catch {
            // try next constraint
          }
        }

        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          })
        }

        // ក្រោយពេលបើកកាមេរ៉ាជោគជ័យ សួររកឈ្មោះកាមេរ៉ាទាំងអស់ (ឥឡូវមាន Permission ហើយ)
        const updatedDevices = await refreshDevices()

        // ពិនិត្យមើលថាតើកាមេរ៉ាដែលទើបតែបើកនោះ ជា DroidCam ឬ Virtual Camera ដែរឬទេ
        const activeTrack = stream.getVideoTracks()[0]
        const activeTrackLabel = activeTrack?.label || ''
        const activeTrackDeviceId = activeTrack?.getSettings()?.deviceId || ''

        if (isVirtualCamera(activeTrackLabel)) {
          // រកឃើញថា Browser ចាប់យក DroidCam / Virtual Camera! ស្វែងរកកាមេរ៉ាធម្មតាភ្លាម
          const physicalCamera = updatedDevices.find(
            (d) => !d.isVirtual && d.deviceId && d.deviceId !== activeTrackDeviceId
          )

          if (physicalCamera) {
            // បិទ virtual stream ចោល
            stream.getTracks().forEach((t) => t.stop())

            try {
              const realStream = await navigator.mediaDevices.getUserMedia({
                video: {
                  deviceId: { exact: physicalCamera.deviceId },
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                },
                audio: false,
              })
              stream = realStream
              chosenDeviceId = physicalCamera.deviceId
              localStorage.setItem(PREFERRED_CAMERA_STORAGE_KEY, physicalCamera.deviceId)
            } catch {
              // try simple
              const realStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: physicalCamera.deviceId } },
                audio: false,
              })
              stream = realStream
              chosenDeviceId = physicalCamera.deviceId
              localStorage.setItem(PREFERRED_CAMERA_STORAGE_KEY, physicalCamera.deviceId)
            }
          }
        }

        streamRef.current = stream

        const track = stream.getVideoTracks()[0]
        const settings = track?.getSettings()
        const finalDeviceId = settings?.deviceId ?? chosenDeviceId ?? ''

        deviceIdRef.current = finalDeviceId
        facingRef.current = targetFacing
        setDeviceId(finalDeviceId)
        setFacing(targetFacing)
        if (finalDeviceId && !isVirtualCamera(track?.label || '')) {
          localStorage.setItem(PREFERRED_CAMERA_STORAGE_KEY, finalDeviceId)
        }

        // ព្យាយាមបើក Continuous Auto Focus លើស្មាតហ្វូន
        try {
          const anyTrack = track as unknown as {
            getCapabilities?: () => { focusMode?: string[] }
            applyConstraints?: (constraints: unknown) => Promise<void>
          }
          const capabilities = anyTrack.getCapabilities?.()
          if (capabilities?.focusMode?.includes('continuous') && anyTrack.applyConstraints) {
            await anyTrack.applyConstraints({
              advanced: [{ focusMode: 'continuous' }],
            })
          }
        } catch {
          // ignore
        }

        const video = videoRef.current
        if (video) {
          video.muted = true
          video.autoplay = true
          video.playsInline = true
          video.setAttribute('muted', '')
          video.setAttribute('playsinline', '')
          video.setAttribute('autoplay', '')
          video.srcObject = stream

          // រង់ចាំឱ្យ Video ដំណើរការ និងមាន Frame ជាក់ស្តែង
          await new Promise<void>((resolve) => {
            if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0) {
              resolve()
            } else {
              const onMeta = () => {
                video.removeEventListener('loadedmetadata', onMeta)
                resolve()
              }
              video.addEventListener('loadedmetadata', onMeta)
              setTimeout(resolve, 800)
            }
          })

          try {
            await video.play()
          } catch {
            // ignore
          }
        }

        setActive(true)
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
          const name = cameraError instanceof DOMException ? cameraError.name : ''
          if (name === 'NotAllowedError') {
            setError('សូមចុច "Allow" ឬអនុញ្ញាតឱ្យប្រើកាមេរ៉ាក្នុង Browser Settings។')
          } else if (name === 'NotFoundError') {
            setError('មិនមានកាមេរ៉ាភ្ជាប់ជាមួយឧបករណ៍នេះទេ។')
          } else if (name === 'NotReadableError') {
            setError('កាមេរ៉ាកំពុងប្រើដោយកម្មវិធីផ្សេង (ឧទាហរណ៍ DroidCam ឬ Zoom)។ សូមបិទកម្មវិធីនោះ រួចសាកល្បងម្ដងទៀត។')
          } else {
            setError('មិនអាចបើកកាមេរ៉ាបានទេ។ សូមពិនិត្យការអនុញ្ញាតលើឧបករណ៍។')
          }
        }
      } finally {
        startingRef.current = false
      }
    },
    [refreshDevices]
  )

  const switchDevice = useCallback(
    async (nextDeviceId: string) => {
      if (!nextDeviceId) return
      deviceIdRef.current = nextDeviceId
      localStorage.setItem(PREFERRED_CAMERA_STORAGE_KEY, nextDeviceId)
      await start(nextDeviceId, facingRef.current)
    },
    [start]
  )

  const switchFacing = useCallback(
    async (nextFacing: CameraFacing) => {
      facingRef.current = nextFacing
      deviceIdRef.current = ''
      await start(undefined, nextFacing)
    },
    [start]
  )

  const toggleFacing = useCallback(async () => {
    const nextFacing: CameraFacing = facingRef.current === 'user' ? 'environment' : 'user'
    await switchFacing(nextFacing)
  }, [switchFacing])

  const capture = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current

      if (!video || !streamRef.current) {
        reject(new Error('កាមេរ៉ាមិនទាន់រួចរាល់ទេ។'))
        return
      }

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480

      const context = canvas.getContext('2d', { alpha: false, desynchronized: true })

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
        0.92
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
    facing,
    isFrontCamera: facing === 'user',
    start,
    stop,
    switchDevice,
    switchFacing,
    toggleFacing,
    capture,
  }
}
