import { useCallback, useEffect, useRef, useState } from 'react'

export interface CameraDevice {
  deviceId: string
  label: string
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const deviceIdRef = useRef<string>('')
  const [active, setActive] = useState(false)
  const [error, setError] = useState('')
  const [devices, setDevices] = useState<CameraDevice[]>([])
  const [deviceId, setDeviceId] = useState('')

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      const cameras = all
        .filter((device) => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `កាមេរ៉ា ${index + 1}`,
        }))
      setDevices(cameras)
    } catch {
      setDevices([])
    }
  }, [])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
  }, [])

  const start = useCallback(async (preferredDeviceId?: string) => {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('កម្មវិធីរុករកនេះមិនអាចប្រើកាមេរ៉ាបានទេ។ សូមប្រើ HTTPS ឬ localhost។')
      return
    }
    const chosen = preferredDeviceId ?? deviceIdRef.current
    const videoConstraints: MediaTrackConstraints = chosen
      ? { deviceId: { exact: chosen }, width: { ideal: 1280 }, height: { ideal: 720 } }
      : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      const track = stream.getVideoTracks()[0]
      const settings = track?.getSettings?.()
      const activeId = settings?.deviceId ?? chosen
      deviceIdRef.current = activeId
      setDeviceId(activeId)
      setActive(true)
      await refreshDevices()
    } catch (cameraError) {
      const name = cameraError instanceof DOMException ? cameraError.name : ''
      setError(name === 'NotAllowedError' ? 'សូមអនុញ្ញាតឱ្យប្រើកាមេរ៉ា។' : name === 'NotFoundError' ? 'មិនមានកាមេរ៉ាភ្ជាប់ទេ។' : 'មិនអាចបើកកាមេរ៉ាបានទេ។ សូមពិនិត្យការកំណត់ឧបករណ៍។')
      stop()
    }
  }, [refreshDevices, stop])

  const switchDevice = useCallback(async (nextDeviceId: string) => {
    deviceIdRef.current = nextDeviceId
    stop()
    await start(nextDeviceId)
  }, [start, stop])

  const capture = useCallback((): Promise<Blob> => new Promise((resolve, reject) => {
    const video = videoRef.current
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      reject(new Error('កាមេរ៉ាមិនទាន់រួចរាល់ទេ។'))
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) {
      reject(new Error('មិនអាចថតរូបពីកាមេរ៉ាបានទេ។'))
      return
    }
    context.drawImage(video, 0, 0)
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('មិនអាចបង្កើតរូបភាពបានទេ។')), 'image/jpeg', 0.9)
  }), [])

  useEffect(() => {
    const onChange = () => { void refreshDevices() }
    navigator.mediaDevices?.addEventListener?.('devicechange', onChange)
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', onChange)
      stop()
    }
  }, [refreshDevices, stop])

  return { videoRef, active, error, devices, deviceId, start, stop, switchDevice, capture }
}
