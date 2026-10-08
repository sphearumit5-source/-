import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, PageHeading } from '../../components/ui/Card'
import { ErrorMessage, Loading, StatusBadge } from '../../components/ui/Loading'
import { useAuth } from '../../hooks/useAuth'
import { attendanceApi, classesApi, getApiError } from '../../services/api'
import type { AttendancePage, Classroom } from '../../types'

const localDate = new Date()
const today = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`
const labels = { present: 'មានវត្តមាន', absent: 'អវត្តមាន', late: 'មកយឺត' } as const

export default function Attendance() {
  const { user } = useAuth()
  const [result, setResult] = useState<AttendancePage>({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 })
  const [classes, setClasses] = useState<Classroom[]>([])
  const [date, setDate] = useState(today)
  const [classId, setClassId] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [records, classroomList] = await Promise.all([
        attendanceApi.list({ attendance_date: date || undefined, class_id: classId || undefined, status: status || undefined, page, page_size: 20 }),
        classesApi.list(),
      ])
      setResult(records)
      setClasses(classroomList)
      setError('')
    } catch (requestError) { setError(getApiError(requestError)) }
    finally { setLoading(false) }
  }, [date, classId, status, page])
  useEffect(() => { void load() }, [load])

  async function setRecordStatus(id: number, nextStatus: 'present' | 'absent' | 'late') {
    try { await attendanceApi.update(id, { status: nextStatus }); await load() }
    catch (requestError) { setError(getApiError(requestError)) }
  }

  async function removeRecord(id: number) {
    if (!window.confirm('តើអ្នកប្រាកដថាចង់លុបកំណត់ត្រានេះមែនទេ?')) return
    try { await attendanceApi.remove(id); await load() }
    catch (requestError) { setError(getApiError(requestError)) }
  }

  return <>
    <PageHeading title="គ្រប់គ្រងវត្តមាន" description={`${result.total.toLocaleString('km-KH')} កំណត់ត្រា`} />
    {error && <div className="mb-4"><ErrorMessage>{error}</ErrorMessage></div>}
    <Card className="p-4 sm:p-5">
      <div className="mb-5 grid gap-3 sm:grid-cols-3"><label className="space-y-1 text-sm font-medium text-slate-700"><span>កាលបរិច្ឆេទ</span><input type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1) }} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3" /></label><label className="space-y-1 text-sm font-medium text-slate-700"><span>ថ្នាក់</span><select value={classId} onChange={(event) => { setClassId(event.target.value); setPage(1) }} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="">គ្រប់ថ្នាក់</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.class_name}</option>)}</select></label><label className="space-y-1 text-sm font-medium text-slate-700"><span>ស្ថានភាព</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="">គ្រប់ស្ថានភាព</option><option value="present">មានវត្តមាន</option><option value="absent">អវត្តមាន</option><option value="late">មកយឺត</option></select></label></div>
      {loading ? <Loading label="កំពុងទាញយកវត្តមាន…" /> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b border-slate-200 text-xs text-slate-500"><tr>{['សិស្ស', 'ថ្នាក់', 'កាលបរិច្ឆេទ', 'ម៉ោងចូល', 'ម៉ោងចេញ', 'ស្ថានភាព', 'ភាពស្រដៀងមុខ', ...(user?.role === 'admin' ? ['សកម្មភាព'] : [])].map((item) => <th key={item} className="px-3 py-3 font-medium">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{result.items.map((record) => <tr key={record.id}><td className="px-3 py-3"><p className="font-semibold text-slate-800">{record.student_name}</p><p className="text-xs text-slate-500">{record.student_code}</p></td><td className="px-3 py-3 text-slate-600">{record.class_name}</td><td className="px-3 py-3 text-slate-600">{record.attendance_date}</td><td className="px-3 py-3 text-slate-600">{record.check_in_time ?? '—'}</td><td className="px-3 py-3 text-slate-600">{record.check_out_time ?? '—'}</td><td className="px-3 py-3">{user?.role === 'admin' ? <select aria-label={`កែស្ថានភាព ${record.student_name}`} value={record.status} onChange={(event) => void setRecordStatus(record.id, event.target.value as typeof record.status)} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select> : <StatusBadge status={record.status} label={labels[record.status]} />}</td><td className="px-3 py-3 text-slate-600">{record.confidence == null ? '—' : `${record.confidence}%`}</td>{user?.role === 'admin' && <td className="px-3 py-3"><button type="button" title="លុបកំណត់ត្រា" aria-label={`លុបវត្តមាន ${record.student_name}`} onClick={() => void removeRecord(record.id)} className="rounded-md p-2 text-rose-700 hover:bg-rose-50"><Trash2 size={16} /></button></td>}</tr>)}</tbody></table>{result.items.length === 0 && <p className="py-12 text-center text-sm text-slate-500">មិនមានកំណត់ត្រាវត្តមានសម្រាប់លក្ខខណ្ឌនេះទេ។</p>}</div>}
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-500"><span>ទំព័រ {page.toLocaleString('km-KH')} / {Math.max(result.total_pages, 1).toLocaleString('km-KH')}</span><div className="flex gap-2"><Button variant="secondary" aria-label="ទំព័រមុន" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="px-2"><ChevronLeft size={17} /></Button><Button variant="secondary" aria-label="ទំព័របន្ទាប់" disabled={page >= result.total_pages} onClick={() => setPage((current) => current + 1)} className="px-2"><ChevronRight size={17} /></Button></div></div>
    </Card>
  </>
}