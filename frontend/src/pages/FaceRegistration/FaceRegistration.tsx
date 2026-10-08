import { Camera, CameraOff, CheckCircle2, ScanFace, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
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
  const [studentId, setStudentId] = useState(searchParams.get('studentId') ?? '')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [auto, setAuto] = useState(true)
  const camera = useCamera()
  const { capture, stop, active } = camera

  useEffect(() => {
    studentsApi.list({ status: 'active', page: 1, page_size: 100 })
      .then((result) => setStudents(result.items))
      .catch((requestError) => setError(getApiError(requestError)))
      .finally(() => setLoading(false))
  }, [])

  const registerFrame = useCallback(async (frame: Blob) => {
    if (!studentId) { setError('សូមជ្រើសរើសសិស្សជាមុន។'); return }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await attendanceApi.registerFace(Number(studentId), frame)
      setMessage(result.message)
      stop()
    } catch (requestError) {
      setError(requestError instanceof Error && !('response' in requestError) ? requestError.message : getApiError(requestError))
    } finally { setSaving(false) }
  }, [studentId, stop])

  const captureAndRegister = useCallback(async () => {
    try {
      await registerFrame(await capture())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : getApiError(requestError))
    }
  }, [capture, registerFrame])

  const scan = useFaceAutoScan({
    active,
    enabled: auto && Boolean(studentId) && !message,
    capture,
    onSubmit: registerFrame,
  })

  return <>
    <PageHeading title="ចុះឈ្មោះមុខសិស្ស" description="ថតរូបមុខសិស្សម្នាក់ ដើម្បីបង្កើតទិន្នន័យសម្រាប់ផ្ទៀងផ្ទាត់វត្តមាន។" />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
      <Card className="overflow-hidden p-4 sm:p-5">
        <div className="relative grid aspect-video min-h-64 place-items-center overflow-hidden rounded-lg bg-slate-950">
          <video ref={camera.videoRef} muted playsInline className={`h-full w-full object-cover ${camera.active ? 'block' : 'hidden'}`} />
          {!camera.active && <div className="flex flex-col items-center gap-3 text-center text-white/80"><ScanFace size={44} strokeWidth={1.3} /><p className="text-sm">សូមអនុញ្ញាតឱ្យប្រើកាមេរ៉ា</p></div>}
          {camera.active && <div className={`pointer-events-none absolute inset-x-[30%] top-[12%] bottom-[10%] rounded-[50%] border-2 border-dashed transition-colors ${scan.centered ? 'border-emerald-300' : 'border-amber-300/90'}`} />}
          {camera.active && auto && <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-slate-950/90 to-transparent p-3 text-center">
            <p className="text-sm font-semibold text-white">{scan.guidance}</p>
            <div className="mx-auto h-1.5 w-40 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-emerald-400 transition-all duration-300" style={{ width: `${scan.progress * 100}%` }} /></div>
          </div>}
        </div>
        {camera.active && camera.devices.length > 1 && <label className="mt-4 block space-y-2 text-sm font-semibold text-slate-800"><span>កាមេរ៉ា</span><select value={camera.deviceId} onChange={(event) => { void camera.switchDevice(event.target.value) }} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal">{camera.devices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select></label>}
        {(camera.error || error) && <div className="mt-4"><ErrorMessage>{camera.error || error}</ErrorMessage></div>}
        {message && <p role="status" className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"><CheckCircle2 size={18} />{message}</p>}
        <div className="mt-4 flex flex-wrap gap-2">{!camera.active ? <Button onClick={() => void camera.start()} icon={<Camera size={17} />}>បើកកាមេរ៉ា</Button> : <><Button variant={auto ? 'primary' : 'secondary'} onClick={() => setAuto((value) => !value)} icon={<Sparkles size={17} />}>{auto ? 'ស្វ័យប្រវត្តិ៖ បើក' : 'ស្វ័យប្រវត្តិ៖ បិទ'}</Button><Button onClick={() => void captureAndRegister()} disabled={saving || !studentId} icon={<ScanFace size={17} />}>{saving ? 'កំពុងចុះឈ្មោះ…' : 'ថតដោយដៃ'}</Button><Button variant="secondary" onClick={camera.stop} icon={<CameraOff size={17} />}>បិទកាមេរ៉ា</Button></>}</div>
      </Card>
      <Card className="p-5">
        <label className="block space-y-2 text-sm font-semibold text-slate-800"><span>ជ្រើសរើសសិស្ស</span>{loading ? <Loading label="កំពុងទាញយកសិស្ស…" /> : <select value={studentId} onChange={(event) => { setStudentId(event.target.value); setMessage('') }} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"><option value="">ជ្រើសរើសសិស្ស</option>{students.map((student) => <option key={student.id} value={student.id}>{student.student_code} · {student.last_name} {student.first_name}</option>)}</select>}</label>
        <div className="mt-6 border-t border-slate-200 pt-5"><h2 className="font-bold text-slate-900">ការណែនាំថត</h2><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600"><li>• ជ្រើសរើសសិស្ស រួចបើកកាមេរ៉ា — ប្រព័ន្ធនឹងចាប់មុខស្វ័យប្រវត្តិ</li><li>• ដាក់មុខឱ្យចំកណ្ដាលស៊ុម រហូតដល់របារបញ្ចប់</li><li>• ជៀសវាងពន្លឺខ្លាំងពីខាងក្រោយ</li><li>• ប្រព័ន្ធរក្សាទុកតែ face embedding មិនរក្សាវីដេអូ</li></ul></div>
      </Card>
    </div>
  </>
}
