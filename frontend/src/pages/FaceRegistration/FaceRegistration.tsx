import {
  Camera,
  CameraOff,
  CheckCircle2,
  FlipHorizontal,
  Info,
  Lightbulb,
  RefreshCw,
  ScanFace,
  Sparkles,
  UserCheck,
  Video,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card, PageHeading } from '../../components/ui/Card'
import { ErrorMessage, Loading } from '../../components/ui/Loading'
import { useCamera } from '../../hooks/useCamera'
import { useFaceAutoScan } from '../../hooks/useFaceAutoScan'
import { attendanceApi, getApiError, studentsApi } from '../../services/api'
import type { StudentPage } from '../../types'

function playSuccessChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(523.25, ctx.currentTime) // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15) // G5
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
  } catch {
    // ignore
  }
}

export default function FaceRegistration() {
  const [searchParams] = useSearchParams()
  const [students, setStudents] = useState<StudentPage['items']>([])
  const [studentId, setStudentId] = useState(searchParams.get('studentId') ?? '')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [auto, setAuto] = useState(true)

  const camera = useCamera()
  const { start, stop, capture, active, isFrontCamera, toggleFacing } = camera

  useEffect(() => {
    let alive = true
    studentsApi
      .list({ limit: 100 })
      .then((data) => {
        if (!alive) return
        setStudents(data.items)
        if (!studentId && data.items.length > 0) {
          setStudentId(String(data.items[0].id))
        }
      })
      .catch((err) => {
        if (alive) setError(getApiError(err, 'មិនអាចទាញយកបញ្ជីសិស្សបានទេ។'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [studentId])

  // Automatically start camera if a student is already selected
  useEffect(() => {
    if (studentId) {
      void start()
    }
    return () => {
      stop()
    }
  }, [studentId, start, stop])

  const registerFrame = useCallback(
    async (frame: Blob) => {
      if (!studentId || saving) return
      setSaving(true)
      setError('')
      setMessage('')
      try {
        const result = await attendanceApi.registerFace(Number(studentId), frame)
        playSuccessChime()
        setMessage(result.message || 'បានចុះឈ្មោះទិន្នន័យមុខជោគជ័យ!')
        stop()
      } catch (requestError) {
        setError(
          getApiError(
            requestError,
            'មិនអាចចុះឈ្មោះមុខបានទេ។ សូមប្រាកដថាមុខស្ថិតនៅចំកណ្តាល និងមានពន្លឺគ្រប់គ្រាន់។'
          )
        )
      } finally {
        setSaving(false)
      }
    },
    [studentId, saving, stop]
  )

  const captureAndRegister = useCallback(async () => {
    if (saving) return
    try {
      setError('')
      const frame = await capture()
      await registerFrame(frame)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : getApiError(requestError))
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
      await start()
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'មិនអាចបើកកាមេរ៉ាបានទេ។'
      )
    }
  }, [start])

  const selectedStudent = students.find((s) => String(s.id) === String(studentId))
  const currentDevice = camera.devices.find((d) => d.deviceId === camera.deviceId)
  const isVirtualActive = currentDevice?.isVirtual

  return (
    <div className="space-y-5">
      <PageHeading
        title="ចុះឈ្មោះផ្ទៃមុខសិស្ស"
        description="ថត និងបញ្ចូលទិន្នន័យផ្ទៃមុខសិស្សទៅក្នុងប្រព័ន្ធ AI ដើម្បីកត់ត្រាវត្តមានស្វ័យប្រវត្តិ។"
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.9fr)]">
        {/* Main Camera Card with Mobile-Adaptive Viewport */}
        <Card className="overflow-hidden p-4 sm:p-6">
          <div className="relative aspect-[3/4] sm:aspect-[4/3] md:aspect-video min-h-[380px] sm:min-h-[420px] w-full overflow-hidden rounded-2xl bg-slate-950 shadow-inner">
            <video
              ref={camera.videoRef}
              muted
              playsInline
              autoPlay
              className={`h-full w-full object-cover transition-transform duration-200 ${
                isFrontCamera ? 'scale-x-[-1]' : 'scale-x-100'
              }`}
            />

            {!camera.active && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-slate-950/95 p-6 text-center text-slate-400">
                <div className="grid size-20 place-items-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 shadow-xl">
                  <ScanFace size={44} strokeWidth={1.4} />
                </div>
                <div>
                  <p className="text-base font-bold text-white">កាមេរ៉ាមិនទាន់ដំណើរការ</p>
                  <p className="mt-1 text-xs text-slate-400 max-w-xs leading-relaxed">
                    {studentId
                      ? 'ចុចប៊ូតុង "បើកកាមេរ៉ា" ដើម្បីថត និងចុះឈ្មោះមុខសិស្ស'
                      : 'សូមជ្រើសរើសសិស្សពីបញ្ជីខាងស្តាំជាមុនសិន'}
                  </p>
                </div>
                <Button
                  size="md"
                  disabled={!studentId}
                  onClick={() => void startCamera()}
                  icon={<Camera size={18} />}
                  className="mt-2"
                >
                  បើកកាមេរ៉ា
                </Button>
              </div>
            )}

            {camera.active && (
              <>
                {/* 4 HUD Corners */}
                <div className="pointer-events-none absolute left-4 top-4 size-7 hud-corner-tl sm:left-6 sm:top-6 sm:size-8" />
                <div className="pointer-events-none absolute right-4 top-4 size-7 hud-corner-tr sm:right-6 sm:top-6 sm:size-8" />
                <div className="pointer-events-none absolute left-4 bottom-4 size-7 hud-corner-bl sm:left-6 sm:bottom-6 sm:size-8" />
                <div className="pointer-events-none absolute right-4 bottom-4 size-7 hud-corner-br sm:right-6 sm:bottom-6 sm:size-8" />

                {/* Laser scanline */}
                <div className="pointer-events-none absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_15px_#818cf8] animate-scan-line" />

                {/* Floating Top Controls with 1-Tap Camera Flip Button */}
                <div className="absolute inset-x-4 top-4 flex items-center justify-between pointer-events-auto z-10">
                  <div className="flex items-center gap-2 rounded-full bg-slate-950/75 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md border border-white/10 shadow-sm">
                    <span className="size-2 rounded-full bg-indigo-400 animate-pulse" />
                    <span>ចុះឈ្មោះមុខ AI</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void toggleFacing()}
                    aria-label="ប្តូរកាមេរ៉ាមុខ-ក្រោយ"
                    className="flex items-center gap-1.5 rounded-full bg-slate-950/80 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md border border-white/15 shadow-md active:scale-95 transition hover:bg-slate-900"
                  >
                    <RefreshCw size={13} className="text-indigo-400" />
                    <span>{isFrontCamera ? 'កាមេរ៉ាមុខ' : 'កាមេរ៉ាក្រោយ'}</span>
                  </button>
                </div>

                {/* Face positioning target frame (Clean white when searching, emerald when centered) */}
                <div
                  className={`pointer-events-none absolute inset-x-[18%] sm:inset-x-[26%] top-[14%] bottom-[16%] rounded-[48%] border-2 border-dashed transition-all duration-300 ${
                    scan.centered
                      ? 'border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)] scale-102 bg-emerald-500/5'
                      : 'border-white/70 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                  }`}
                />

                {auto && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent p-4 text-center z-10">
                    <p className="text-xs sm:text-sm font-bold text-white drop-shadow-sm">
                      {saving ? '⚡ កំពុងចុះឈ្មោះចូលប្រព័ន្ធ…' : scan.guidance}
                    </p>
                    <div className="mx-auto mt-2 h-2 w-44 overflow-hidden rounded-full bg-white/25 backdrop-blur-sm">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-200"
                        style={{
                          width: `${Math.min(100, Math.max(0, scan.progress * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Camera Device Switcher (កាមេរ៉ាធម្មតា vs DroidCam) */}
          {camera.devices.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/90 p-3 text-xs text-slate-700">
              <div className="flex items-center gap-2 font-medium">
                <Video size={16} className="text-blue-600 shrink-0" />
                <span>ឧបករណ៍កាមេរ៉ា៖</span>
              </div>
              <div className="flex items-center gap-2 min-w-[220px] flex-1 sm:max-w-xs">
                <select
                  value={camera.deviceId}
                  onChange={(e) => void camera.switchDevice(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {camera.devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.isVirtual ? `⚠️ ${d.label} (Virtual - មិនណែនាំ)` : `📷 ${d.label} (កាមេរ៉ាធម្មតា)`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Warning if current camera is DroidCam or Virtual Camera */}
          {isVirtualActive && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <Info size={16} className="shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">
                  កំពុងភ្ជាប់ជាមួយ Virtual Camera ({currentDevice?.label})
                </p>
                <p className="mt-0.5 text-amber-800">
                  ប្រសិនបើមើលមិនឃើញរូបភាព សូមជ្រើសរើស <strong>"កាមេរ៉ាធម្មតា (Integrated/USB)"</strong> ពីបញ្ជីខាងលើវិញ។
                </p>
              </div>
            </div>
          )}

          {(camera.error || error) && (
            <div className="mt-4">
              <ErrorMessage>{error || camera.error}</ErrorMessage>
            </div>
          )}

          {message && (
            <div className="mt-4 flex items-center gap-3.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 animate-scale-in">
              <span className="grid size-11 place-items-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
                <CheckCircle2 size={22} />
              </span>
              <div>
                <p className="font-bold text-sm">ចុះឈ្មោះមុខសិស្សជោគជ័យ!</p>
                <p className="text-xs text-emerald-700 mt-0.5">{message}</p>
              </div>
            </div>
          )}

          {/* Camera Controls Toolbar */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-4">
            {!camera.active ? (
              <Button
                size="lg"
                disabled={!studentId}
                onClick={() => void startCamera()}
                icon={<Camera size={18} />}
                className="w-full sm:w-auto"
              >
                បើកកាមេរ៉ា
              </Button>
            ) : (
              <>
                <Button
                  variant={auto ? 'primary' : 'secondary'}
                  disabled={saving || !studentId || Boolean(message)}
                  onClick={() => setAuto((value) => !value)}
                  icon={<Sparkles size={16} />}
                >
                  {auto ? 'ស្វ័យប្រវត្តិ៖ បើក' : 'ស្វ័យប្រវត្តិ៖ បិទ'}
                </Button>
                <Button
                  variant="secondary"
                  disabled={saving || !studentId}
                  onClick={() => void captureAndRegister()}
                  icon={<ScanFace size={16} />}
                >
                  {saving ? 'កំពុងចុះឈ្មោះ…' : 'ថតដោយដៃ'}
                </Button>
                <Button
                  variant="secondary"
                  disabled={saving}
                  onClick={() => void toggleFacing()}
                  icon={<FlipHorizontal size={16} />}
                  title="ប្តូរកាមេរ៉ាមុខ / ក្រោយ"
                >
                  ប្តូរកាមេរ៉ា
                </Button>
                <Button
                  variant="ghost"
                  disabled={saving}
                  onClick={stop}
                  icon={<CameraOff size={16} />}
                  className="text-rose-600 hover:bg-rose-50 ml-auto"
                >
                  បិទកាមេរ៉ា
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Student Selection & Guidelines */}
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-3">
              <UserCheck size={18} className="text-indigo-600" />
              <span>ជ្រើសរើសសិស្សដែលត្រូវចុះឈ្មោះមុខ</span>
            </div>

            {loading ? (
              <Loading label="កំពុងទាញយកបញ្ជីសិស្ស…" />
            ) : (
              <div className="space-y-3">
                <select
                  value={studentId}
                  onChange={(e) => {
                    setStudentId(e.target.value)
                    setMessage('')
                    setError('')
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- ជ្រើសរើសសិស្ស --</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.student_code} - {student.last_name} {student.first_name} ({student.class_name || 'គ្មានថ្នាក់'})
                    </option>
                  ))}
                </select>

                {selectedStudent && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-xs text-indigo-950">
                    <p className="font-bold text-indigo-900 text-sm">
                      {selectedStudent.last_name} {selectedStudent.first_name}
                    </p>
                    <p className="text-slate-600 mt-1">
                      អត្តលេខ៖ <span className="font-mono font-bold text-slate-800">{selectedStudent.student_code}</span> | ថ្នាក់៖ <span className="font-bold text-slate-800">{selectedStudent.class_name}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      ស្ថានភាពមុខ៖ {selectedStudent.photo ? (
                        <span className="font-bold text-emerald-600">✓ មានរូបថតមុខរួចហើយ (អាចថតដើម្បី Update បាន)</span>
                      ) : (
                        <span className="font-bold text-amber-600">⚠ មិនទាន់មានរូបថតមុខ</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-3 text-sm">
              <Lightbulb size={18} className="text-amber-500" />
              <span>ការណែនាំថតរូបឱ្យ AI ចាប់បានច្បាស់</span>
            </div>
            <ul className="space-y-2.5 text-xs leading-relaxed text-slate-600">
              <li className="flex items-start gap-2">
                <span className="font-bold text-indigo-600">•</span>
                <span>ឱ្យសិស្សមើលចំកាមេរ៉ា ដោយមិនបាច់ពាក់មួក ឬវ៉ែនតាខ្មៅ។</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-indigo-600">•</span>
                <span>កន្លែងថតគួរមានពន្លឺគ្រប់គ្រាន់ មិនងងឹត ឬចាំងពន្លឺខ្លាំងពេក។</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-indigo-600">•</span>
                <span>ផ្ទៃមុខគួរស្ថិតនៅក្នុងរង្វង់ស៊ុមពងក្រពើចំកណ្តាលអេក្រង់។</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
