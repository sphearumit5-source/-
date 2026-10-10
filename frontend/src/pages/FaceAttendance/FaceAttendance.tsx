import {
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  FlipHorizontal,
  Info,
  RefreshCw,
  ScanFace,
  Sparkles,
  Video,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, PageHeading } from '../../components/ui/Card'
import { ErrorMessage, StatusBadge } from '../../components/ui/Loading'
import { useCamera } from '../../hooks/useCamera'
import { useFaceAutoScan } from '../../hooks/useFaceAutoScan'
import { attendanceApi, getApiError } from '../../services/api'

type Recognition = Awaited<ReturnType<typeof attendanceApi.recognize>>

// ផ្តល់សំឡេង Chime ស្រាលពេលស្កេនជាប់ (Web Audio API)
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
    osc.frequency.setValueAtTime(659.25, ctx.currentTime) // E5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12) // A5
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.3)
  } catch {
    // ignore
  }
}

export default function FaceAttendance() {
  const camera = useCamera()
  const { start, stop, capture, active, isFrontCamera, toggleFacing } = camera
  const [result, setResult] = useState<Recognition | null>(null)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [auto, setAuto] = useState(true)

  // Auto-start camera on component mount
  useEffect(() => {
    let mounted = true
    const initCamera = async () => {
      try {
        if (mounted) await start()
      } catch {
        // handled in hook
      }
    }
    void initCamera()

    return () => {
      mounted = false
      stop()
    }
  }, [start, stop])

  const recognizeFrame = useCallback(async (frame: Blob) => {
    setScanning(true)
    setError('')
    setResult(null)
    try {
      const recognition = await attendanceApi.recognize(frame)
      setResult(recognition)
      playSuccessChime()
    } catch (requestError) {
      setError(
        requestError instanceof Error && !('response' in requestError)
          ? requestError.message
          : getApiError(requestError, 'មិនអាចស្គាល់សិស្សនេះបានទេ។ សូមសាកល្បងម្ដងទៀត។')
      )
    } finally {
      setScanning(false)
    }
  }, [])

  const scan = useCallback(async () => {
    try {
      await recognizeFrame(await capture())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : getApiError(requestError))
    }
  }, [capture, recognizeFrame])

  const faceScan = useFaceAutoScan({
    active,
    enabled: auto,
    capture,
    onSubmit: recognizeFrame,
    cooldownMs: 4000,
  })

  const currentDevice = camera.devices.find((d) => d.deviceId === camera.deviceId)
  const isVirtualActive = currentDevice?.isVirtual

  return (
    <div className="space-y-5">
      <PageHeading
        title="ស្កេនវត្តមានដោយ AI"
        description="ប្រើប្រាស់កាមេរ៉ាធម្មតា ឬស្មាតហ្វូន ដើម្បីកត់ត្រាវត្តមានសិស្សដោយស្វ័យប្រវត្តិ។"
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.9fr)]">
        {/* Main Camera Card - Mobile Adaptive Viewport */}
        <Card className="overflow-hidden p-4 sm:p-6">
          <div className="relative aspect-[3/4] sm:aspect-[4/3] md:aspect-video min-h-[380px] sm:min-h-[420px] w-full overflow-hidden rounded-2xl bg-slate-950 shadow-inner">
            {/* Always keep video mounted so stream renders without black box */}
            <video
              ref={camera.videoRef}
              muted
              playsInline
              autoPlay
              className={`h-full w-full object-cover transition-transform duration-200 ${
                isFrontCamera ? 'scale-x-[-1]' : 'scale-x-100'
              }`}
            />

            {/* Offline Camera State (Only shown when camera is off) */}
            {!camera.active && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-slate-950/95 p-6 text-center text-slate-400">
                <div className="grid size-20 place-items-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 shadow-xl">
                  <ScanFace size={44} strokeWidth={1.4} />
                </div>
                <div>
                  <p className="text-base font-bold text-white">កាមេរ៉ាមិនទាន់ដំណើរការ</p>
                  <p className="mt-1 text-xs text-slate-400 max-w-xs leading-relaxed">
                    ចុចប៊ូតុងខាងក្រោមដើម្បីបើកកាមេរ៉ាស្កេន
                  </p>
                </div>
                <Button
                  size="md"
                  onClick={() => void start()}
                  icon={<Camera size={18} />}
                  className="mt-2"
                >
                  បើកកាមេរ៉ាឡើងវិញ
                </Button>
              </div>
            )}

            {/* AI HUD Scanner Overlays when camera is active */}
            {camera.active && (
              <>
                {/* 4 Corner Reticles */}
                <div className="pointer-events-none absolute left-4 top-4 size-7 hud-corner-tl sm:left-6 sm:top-6 sm:size-8" />
                <div className="pointer-events-none absolute right-4 top-4 size-7 hud-corner-tr sm:right-6 sm:top-6 sm:size-8" />
                <div className="pointer-events-none absolute left-4 bottom-4 size-7 hud-corner-bl sm:left-6 sm:bottom-6 sm:size-8" />
                <div className="pointer-events-none absolute right-4 bottom-4 size-7 hud-corner-br sm:right-6 sm:bottom-6 sm:size-8" />

                {/* Laser scanline animation */}
                <div className="pointer-events-none absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-scan-line" />

                {/* Floating Top Bar (Status & Quick Flip Button) */}
                <div className="absolute inset-x-4 top-4 flex items-center justify-between pointer-events-auto z-10">
                  <div className="flex items-center gap-2 rounded-full bg-slate-950/75 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md border border-white/10 shadow-sm">
                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>AI កំពុងដំណើរការ</span>
                  </div>

                  {/* 1-Tap Mobile Flip Camera Button */}
                  <button
                    type="button"
                    onClick={() => void toggleFacing()}
                    aria-label="ប្តូរកាមេរ៉ាមុខ-ក្រោយ"
                    className="flex items-center gap-1.5 rounded-full bg-slate-950/80 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md border border-white/15 shadow-md active:scale-95 transition hover:bg-slate-900"
                  >
                    <RefreshCw size={13} className="text-emerald-400" />
                    <span>{isFrontCamera ? 'កាមេរ៉ាមុខ' : 'កាមេរ៉ាក្រោយ'}</span>
                  </button>
                </div>

                {/* Centering Face Target Oval (Clean white glowing reticle when searching, emerald when centered) */}
                <div
                  className={`pointer-events-none absolute inset-x-[18%] sm:inset-x-[26%] top-[14%] bottom-[16%] rounded-[48%] border-2 border-dashed transition-all duration-300 ${
                    faceScan.centered
                      ? 'border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)] scale-102 bg-emerald-500/5'
                      : 'border-white/70 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                  }`}
                />

                {/* Bottom Guidance & Progress */}
                {auto && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent p-4 text-center z-10">
                    <p className="text-xs sm:text-sm font-bold text-white drop-shadow-sm">
                      {faceScan.locked ? '⚡ បានស្គាល់មុខ! កំពុងកត់ត្រា…' : faceScan.guidance}
                    </p>
                    <div className="mx-auto mt-2 h-2 w-44 overflow-hidden rounded-full bg-white/25 backdrop-blur-sm">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
                        style={{
                          width: `${Math.min(100, Math.max(0, faceScan.progress * 100))}%`,
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

          {/* Error Message */}
          {(camera.error || error) && (
            <div className="mt-4">
              <ErrorMessage>{camera.error || error}</ErrorMessage>
            </div>
          )}

          {/* Recognition Result Card */}
          {result && (
            <div className="mt-4 animate-scale-in rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-white p-4.5 shadow-sm">
              <div className="flex items-start gap-3.5">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
                  <CheckCircle2 size={24} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-200/70 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900">
                      កត់ត្រាវត្តមានជោគជ័យ
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      ស្រដៀង {(result.similarity * 100).toFixed(1)}%
                    </span>
                  </div>
                  <h3 className="mt-1 text-base sm:text-lg font-extrabold text-slate-900">
                    {result.student_name}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span>
                      អត្តលេខ៖ <strong className="font-mono text-slate-800">{result.student_code}</strong>
                    </span>
                    <span>
                      ថ្នាក់៖ <strong className="text-slate-800">{result.class_name}</strong>
                    </span>
                    <span>
                      ម៉ោង៖ <strong className="text-slate-800">{result.check_in_time}</strong>
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <StatusBadge
                      status={result.status}
                      label={result.status === 'late' ? 'មកយឺត' : 'មានវត្តមាន'}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Toolbar Buttons */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-4">
            {!camera.active ? (
              <Button
                size="lg"
                onClick={() => void start()}
                icon={<Camera size={18} />}
                className="w-full sm:w-auto"
              >
                បើកកាមេរ៉ាស្កេន
              </Button>
            ) : (
              <>
                <Button
                  variant={auto ? 'primary' : 'secondary'}
                  onClick={() => setAuto((value) => !value)}
                  icon={<Sparkles size={16} />}
                >
                  {auto ? 'ស្វ័យប្រវត្តិ៖ បើក' : 'ស្វ័យប្រវត្តិ៖ បិទ'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void scan()}
                  disabled={scanning}
                  icon={<ScanFace size={16} />}
                >
                  {scanning ? 'កំពុងស្កេន…' : 'ស្កេនដោយដៃ'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void toggleFacing()}
                  icon={<FlipHorizontal size={16} />}
                  title="ប្តូរកាមេរ៉ាមុខ / ក្រោយ"
                >
                  ប្តូរកាមេរ៉ា
                </Button>
                <Button
                  variant="ghost"
                  onClick={stop}
                  icon={<CameraOff size={16} />}
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 ml-auto"
                >
                  បិទកាមេរ៉ា
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Instructions Sidebar */}
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                <Zap size={20} />
              </span>
              <div>
                <h2 className="font-bold text-slate-900">គន្លឹះស្កេនលឿនលើទូរស័ព្ទ</h2>
                <p className="text-xs text-slate-500">ស្គាល់មុខក្នុងរយៈពេល ០.៥ វិនាទី</p>
              </div>
            </div>

            <ol className="mt-4 space-y-3 text-xs leading-relaxed text-slate-600">
              <li className="flex items-start gap-2.5">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">
                  ១
                </span>
                <span>កាន់ទូរស័ព្ទឱ្យស្ងៀម ឬដាក់លើជើងទម្រ (Tripod) នៅកម្ពស់ស្មើមុខសិស្ស។</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">
                  ២
                </span>
                <span>ចុច <strong>"ប្តូរកាមេរ៉ា"</strong> បើចង់ប្រើកាមេរ៉ាក្រោយដើម្បីរូបភាពកាន់តែច្បាស់។</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">
                  ៣
                </span>
                <span>ឱ្យសិស្សឈរចំពីមុខស៊ុម — AI នឹងស្កេន និងបន្លឺសំឡេងកត់ត្រាវត្តមានភ្លាម។</span>
              </li>
            </ol>

            <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs text-indigo-900">
              <div className="flex items-center gap-2 font-bold text-indigo-800 mb-1">
                <Info size={14} />
                <span>ចំណាំលើស្មាតហ្វូន</span>
              </div>
              <p className="leading-relaxed">
                កម្មវិធីរុករក Chrome និង Safari គាំទ្រការស្កេនស្វ័យប្រវត្តិកាន់តែរលូននៅពេលប្រើប្រាស់ HTTPS ឬ Local Network របស់សាលា។
              </p>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600">
                <Clock size={20} />
              </span>
              <div>
                <h3 className="font-bold text-slate-900">ស្ថានភាពស្កេន AI</h3>
                <p className="text-xs text-slate-500">ប្រព័ន្ធស្កេនបន្តបន្ទាប់</p>
              </div>
            </div>
            <div className="mt-4 space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>ទម្រង់ស្កេន៖</span>
                <span className="font-bold text-slate-800">
                  {auto ? 'ស្វ័យប្រវត្តិ (Auto)' : 'ដោយដៃ (Manual)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>កាមេរ៉ា៖</span>
                <span className="font-bold text-slate-800">
                  {isFrontCamera ? 'កាមេរ៉ាមុខ (User)' : 'កាមេរ៉ាក្រោយ (Environment)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>ការចាប់យកមុខ៖</span>
                <span
                  className={`font-bold ${
                    faceScan.centered ? 'text-emerald-600' : 'text-slate-500'
                  }`}
                >
                  {faceScan.centered ? 'ចំកណ្តាលល្អ' : 'រង់ចាំមុខ…'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
