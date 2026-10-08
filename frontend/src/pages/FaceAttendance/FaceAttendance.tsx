import { AlertCircle, Camera, CameraOff, CheckCircle2, ScanFace, Sparkles } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, PageHeading } from '../../components/ui/Card'
import { ErrorMessage, StatusBadge } from '../../components/ui/Loading'
import { useCamera } from '../../hooks/useCamera'
import { useFaceAutoScan } from '../../hooks/useFaceAutoScan'
import { attendanceApi, getApiError } from '../../services/api'

type Recognition = Awaited<ReturnType<typeof attendanceApi.recognize>>

export default function FaceAttendance() {
  const camera = useCamera()
  const { capture, active } = camera
  const [result, setResult] = useState<Recognition | null>(null)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [auto, setAuto] = useState(true)

  const recognizeFrame = useCallback(async (frame: Blob) => {
    setScanning(true)
    setError('')
    setResult(null)
    try {
      setResult(await attendanceApi.recognize(frame))
    } catch (requestError) {
      setError(requestError instanceof Error && !('response' in requestError) ? requestError.message : getApiError(requestError, 'មិនអាចស្គាល់សិស្សនេះបានទេ។'))
    } finally { setScanning(false) }
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
    cooldownMs: 5000,
  })

  return <>
    <PageHeading title="ស្កេនវត្តមាន" description="ប្រើកាមេរ៉ាដើម្បីផ្ទៀងផ្ទាត់សិស្ស និងកត់ត្រាវត្តមានប្រចាំថ្ងៃ។" />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
      <Card className="overflow-hidden p-4 sm:p-5">
        <div className="relative grid aspect-video min-h-64 place-items-center overflow-hidden rounded-lg bg-slate-950">
          <video ref={camera.videoRef} muted playsInline className={`h-full w-full object-cover ${camera.active ? 'block' : 'hidden'}`} />
          {!camera.active && <div className="flex flex-col items-center gap-3 text-center text-white/80"><ScanFace size={48} strokeWidth={1.3} /><p className="text-sm">សូមអនុញ្ញាតឱ្យប្រើកាមេរ៉ា</p></div>}
          {camera.active && <div className={`pointer-events-none absolute inset-x-[30%] top-[12%] bottom-[10%] rounded-[50%] border-2 border-dashed transition-colors ${faceScan.centered ? 'border-emerald-300' : 'border-amber-300/90'}`} />}
          {camera.active && auto && <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-slate-950/90 to-transparent p-3 text-center">
            <p className="text-sm font-semibold text-white">{faceScan.locked ? 'កំពុងផ្ទៀងផ្ទាត់…' : faceScan.guidance}</p>
            <div className="mx-auto h-1.5 w-40 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-emerald-400 transition-all duration-300" style={{ width: `${faceScan.progress * 100}%` }} /></div>
          </div>}
        </div>
        {camera.active && camera.devices.length > 1 && <label className="mt-4 block space-y-2 text-sm font-semibold text-slate-800"><span>កាមេរ៉ា</span><select value={camera.deviceId} onChange={(event) => { void camera.switchDevice(event.target.value) }} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal">{camera.devices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select></label>}
        {(camera.error || error) && <div className="mt-4"><ErrorMessage>{camera.error || error}</ErrorMessage></div>}
        {result && <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-800" size={20} /><div className="min-w-0"><p className="font-bold text-emerald-950">បានកត់ត្រាវត្តមាន</p><p className="mt-1 text-sm text-slate-700">{result.student_name} · {result.student_code}</p><p className="text-sm text-slate-600">{result.class_name} · {result.check_in_time}</p><div className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge status={result.status} label={result.status === 'late' ? 'មកយឺត' : 'មានវត្តមាន'} /><span className="text-xs text-slate-600">ភាពស្រដៀងមុខ {(result.similarity * 100).toFixed(1)}%</span></div></div></div>}
        {error && <p className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><AlertCircle size={17} />{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">{!camera.active ? <Button onClick={() => void camera.start()} icon={<Camera size={17} />}>បើកកាមេរ៉ា</Button> : <><Button variant={auto ? 'primary' : 'secondary'} onClick={() => setAuto((value) => !value)} icon={<Sparkles size={17} />}>{auto ? 'ស្វ័យប្រវត្តិ៖ បើក' : 'ស្វ័យប្រវត្តិ៖ បិទ'}</Button><Button onClick={() => void scan()} disabled={scanning} icon={<ScanFace size={17} />}>{scanning ? 'កំពុងស្កេន…' : 'ស្កេនដោយដៃ'}</Button><Button variant="secondary" onClick={camera.stop} icon={<CameraOff size={17} />}>បិទកាមេរ៉ា</Button></>}</div>
      </Card>
      <Card className="p-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-800"><ScanFace size={20} /></span><h2 className="font-bold text-slate-900">លទ្ធផលស្កេន</h2></div><p className="mt-4 text-sm leading-7 text-slate-600">បើកកាមេរ៉ា រួចដាក់មុខសិស្សឱ្យចំកណ្ដាលស៊ុម — ប្រព័ន្ធនឹងស្គាល់មុខ និងកត់ត្រាវត្តមានដោយស្វ័យប្រវត្តិ ដោយមិនចាំបាច់ចុច។</p><div className="mt-5 space-y-3 border-t border-slate-200 pt-5 text-sm text-slate-600"><p>ម៉ោងកំណត់មកយឺតត្រូវបានគ្រប់គ្រងក្នុងការកំណត់សាលា។</p><p>សិស្សម្នាក់អាចមានកំណត់ត្រាវត្តមានមួយក្នុងមួយថ្ងៃ។</p></div></Card>
    </div>
  </>
}
