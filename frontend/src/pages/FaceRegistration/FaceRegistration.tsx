
import {
  Camera,
  CameraOff,
  CheckCircle2,
  ScanFace,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card, PageHeading } from '../../components/ui/Card'
import { ErrorMessage, Loading } from '../../components/ui/Loading'
import { useCamera } from '../../hooks/useCamera'
import { useFaceAutoScan } from '../../hooks/useFaceAutoScan'
import { attendanceApi, getApiError, studentsApi } from '../../services/api'
import type { StudentPage } from '../../types'

export default function FaceRegistration() {
  const [searchParams] = useSearchParams()

  const [students, setStudents] = useState<StudentPage['items']>([])
  const [studentId, setStudentId] = useState(
    searchParams.get('studentId') ?? '',
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [auto, setAuto] = useState(true)

  const camera = useCamera()
  const { capture, stop, active } = camera

  // រកកាមេរ៉ាមុខ និងកាមេរ៉ាក្រោយតាមឈ្មោះឧបករណ៍
  const frontCamera = useMemo(
    () =>
      camera.devices.find((device) =>
        /front|user|facetime|មុខ/i.test(device.label),
      ),
    [camera.devices],
  )

  const backCamera = useMemo(
    () =>
      camera.devices.find((device) =>
        /back|rear|environment|ក្រោយ/i.test(device.label),
      ),
    [camera.devices],
  )

  useEffect(() => {
    studentsApi
      .list({ status: 'active', page: 1, page_size: 100 })
      .then((result) => setStudents(result.items))
      .catch((requestError) => setError(getApiError(requestError)))
      .finally(() => setLoading(false))
  }, [])

  const registerFrame = useCallback(
    async (frame: Blob) => {
      if (!studentId) {
        setError('សូមជ្រើសរើសសិស្សជាមុន។')
        return
      }

      if (saving) return

      setSaving(true)
      setError('')
      setMessage('')

      try {
        const result = await attendanceApi.registerFace(
          Number(studentId),
          frame,
        )

        setMessage(result.message)
        stop()
      } catch (requestError) {
        setError(
          requestError instanceof Error &&
            !('response' in requestError)
            ? requestError.message
            : getApiError(requestError),
        )
      } finally {
        setSaving(false)
      }
    },
    [studentId, saving, stop],
  )

  const captureAndRegister = useCallback(async () => {
    if (saving) return

    try {
      setError('')
      const frame = await capture()
      await registerFrame(frame)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : getApiError(requestError),
      )
    }
  }, [capture, registerFrame, saving])

  const scan = useFaceAutoScan({
    active,
    enabled: auto && Boolean(studentId) && !message && !saving,
    capture,
    onSubmit: registerFrame,
  })

  const startCamera = useCallback(async () => {
    setError('')
    setMessage('')

    try {
      await camera.start()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'មិនអាចបើកកាមេរ៉ាបានទេ។',
      )
    }
  }, [camera])

  const switchCamera = useCallback(
    async (deviceId: string) => {
      if (!deviceId) return

      setError('')
      setMessage('')

      try {
        await camera.switchDevice(deviceId)
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'មិនអាចប្តូរកាមេរ៉ាបានទេ។',
        )
      }
    },
    [camera],
  )

  return (
    <>
      <PageHeading
        title="ចុះឈ្មោះមុខសិស្ស"
        description="ថតរូបមុខសិស្ស ដើម្បីបង្កើតទិន្នន័យសម្រាប់ផ្ទៀងផ្ទាត់វត្តមាន។"
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
        <Card className="overflow-hidden p-4 sm:p-5">
          {/* Camera preview */}
          <div className="relative grid aspect-video min-h-64 place-items-center overflow-hidden rounded-xl bg-slate-950">
            <video
              ref={camera.videoRef}
              muted
              playsInline
              autoPlay
              className={`h-full w-full object-contain ${
                camera.active ? 'block' : 'hidden'
              }`}
            />

            {!camera.active && (
              <div className="flex flex-col items-center gap-3 text-center text-white/80">
                <ScanFace size={48} strokeWidth={1.3} />
                <p className="text-sm">សូមអនុញ្ញាតឱ្យប្រើកាមេរ៉ា</p>
              </div>
            )}

            {/* Face positioning guide */}
            {camera.active && (
              <div
                className={`pointer-events-none absolute inset-x-[30%] top-[8%] bottom-[12%] rounded-[50%] border-2 border-dashed transition-colors ${
                  scan.centered
                    ? 'border-emerald-400'
                    : 'border-amber-300'
                }`}
              />
            )}

            {camera.active && auto && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-slate-950/90 to-transparent p-4 text-center">
                <p className="text-sm font-semibold text-white">
                  {scan.guidance}
                </p>

                <div className="mx-auto h-2 w-44 overflow-hidden rounded-full bg-white/25">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, scan.progress * 100),
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Front / rear camera selection */}
          {camera.active && camera.devices.length > 1 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                disabled={!frontCamera || saving}
                onClick={() => {
                  if (frontCamera) {
                    void switchCamera(frontCamera.deviceId)
                  }
                }}
                icon={<Camera size={17} />}
              >
                កាមេរ៉ាមុខ
              </Button>

              <Button
                variant="secondary"
                disabled={!backCamera || saving}
                onClick={() => {
                  if (backCamera) {
                    void switchCamera(backCamera.deviceId)
                  }
                }}
                icon={<RefreshCw size={17} />}
              >
                កាមេរ៉ាក្រោយ
              </Button>
            </div>
          )}

          {/* Show all cameras when labels are available */}
          {camera.active && camera.devices.length > 1 && (
            <label className="mt-3 block space-y-2 text-sm font-semibold text-slate-800">
              <span>ជ្រើសរើសកាមេរ៉ាផ្សេងទៀត</span>
              <select
                value={camera.deviceId}
                onChange={(event) =>
                  void switchCamera(event.target.value)
                }
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"
              >
                {camera.devices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `កាមេរ៉ា ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
          )}

          {(camera.error || error) && (
            <div className="mt-4">
              <ErrorMessage>{error || camera.error}</ErrorMessage>
            </div>
          )}

          {message && (
            <p
              role="status"
              className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
            >
              <CheckCircle2 size={18} />
              {message}
            </p>
          )}

          {/* Camera controls */}
          <div className="mt-4 flex flex-wrap gap-2">
            {!camera.active ? (
              <Button
                onClick={() => void startCamera()}
                icon={<Camera size={17} />}
              >
                បើកកាមេរ៉ា
              </Button>
            ) : (
              <>
                <Button
                  variant={auto ? 'primary' : 'secondary'}
                  disabled={saving || !studentId || Boolean(message)}
                  onClick={() => setAuto((value) => !value)}
                  icon={<Sparkles size={17} />}
                >
                  {auto
                    ? 'ស្វ័យប្រវត្តិ៖ បើក'
                    : 'ស្វ័យប្រវត្តិ៖ បិទ'}
                </Button>

                <Button
                  disabled={saving || !studentId}
                  onClick={() => void captureAndRegister()}
                  icon={<ScanFace size={17} />}
                >
                  {saving ? 'កំពុងចុះឈ្មោះ…' : 'ថតដោយដៃ'}
                </Button>

                <Button
                  variant="secondary"
                  disabled={saving}
                  onClick={camera.stop}
                  icon={<CameraOff size={17} />}
                >
                  បិទកាមេរ៉ា
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Student selection and instructions */}
        <Card className="p-5">
          <label className="block space-y-2 text-sm font-semibold text-slate-800">
            <span>ជ្រើសរើសសិស្ស</span>

            {loading ? (
              <Loading label="កំពុងទាញយកសិស្ស…" />
            ) : (
              <select
                value={studentId}
                onChange={(event) => {
                  setStudentId(event.target.value)
                  setMessage('')
                  setError('')
                }}
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"
              >
                <option value="">ជ្រើសរើសសិស្ស</option>

                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.student_code} · {student.last_name}{' '}
                    {student.first_name}
                  </option>
                ))}
              </select>
            )}
          </label>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <h2 className="font-bold text-slate-900">
              ការណែនាំដើម្បីថតមុខឱ្យច្បាស់
            </h2>

            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              <li>• ជ្រើសរើសសិស្ស មុនបើកកាមេរ៉ា។</li>
              <li>• ដាក់មុខឱ្យចំកណ្ដាលស៊ុម និងមើលត្រង់កាមេរ៉ា។</li>
              <li>• ឈរនៅកន្លែងមានពន្លឺគ្រប់គ្រាន់។</li>
              <li>• កុំឱ្យពន្លឺថ្ងៃចាំងពីខាងក្រោយក្បាល។</li>
              <li>• កុំរំកិលកាមេរ៉ា ខណៈប្រព័ន្ធកំពុងថត។</li>
              <li>• សាកល្បងកាមេរ៉ាមុខ និងក្រោយ ដើម្បីប្រៀបធៀបភាពច្បាស់។</li>
            </ul>

            <p className="mt-4 rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-800">
              ចំណាំ៖ គុណភាពរូបភាពពិតប្រាកដអាស្រ័យលើកាមេរ៉ា និង
              Hook useCamera។ ការប្តូរកាមេរ៉ាមុខ/ក្រោយអាស្រ័យលើ
              ឧបករណ៍ដែល Browser អាចរកឃើញ។
            </p>
          </div>
        </Card>
      </div>
    </>
  )
}
