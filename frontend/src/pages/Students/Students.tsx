import { Camera, ChevronLeft, ChevronRight, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StudentPhoto } from '../../components/students/StudentPhoto'
import { Button } from '../../components/ui/Button'
import { Card, PageHeading } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { ErrorMessage, Loading, StatusBadge } from '../../components/ui/Loading'
import { useAuth } from '../../hooks/useAuth'
import { classesApi, getApiError, studentsApi } from '../../services/api'
import type { Classroom, Student } from '../../types'

export default function Students() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [items, setItems] = useState<Student[]>([])
  const [classes, setClasses] = useState<Classroom[]>([])
  const [search, setSearch] = useState('')
  const [classId, setClassId] = useState('')
  const [gender, setGender] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<Student | null>(null)
  const [viewing, setViewing] = useState<Student | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [result, classList] = await Promise.all([
        studentsApi.list({ search: search || undefined, class_id: classId || undefined, gender: gender || undefined, page, page_size: 10 }),
        classesApi.list(),
      ])
      setItems(result.items)
      setTotal(result.total)
      setTotalPages(Math.max(result.total_pages, 1))
      setClasses(classList)
      setError('')
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setLoading(false)
    }
  }, [search, classId, gender, page])

  useEffect(() => { void load() }, [load])

  async function removeStudent() {
    if (!deleting) return
    setBusy(true)
    try {
      await studentsApi.remove(deleting.id)
      setDeleting(null)
      await load()
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeading title="គ្រប់គ្រងសិស្ស" description={`សិស្សសរុប ${total.toLocaleString('km-KH')} នាក់`} action={user?.role === 'admin' ? <Button onClick={() => navigate('/students/add')} icon={<Plus size={17} />}>បន្ថែមសិស្ស</Button> : undefined} />
      {error && <div className="mb-4"><ErrorMessage>{error}</ErrorMessage></div>}
      <Card className="p-4 sm:p-5">
        <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(220px,1fr)_200px_160px]">
          <label className="relative"><span className="sr-only">ស្វែងរកសិស្ស</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="ស្វែងរកតាមឈ្មោះ ឬលេខសម្គាល់" className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm" /></label>
          <select aria-label="ត្រងតាមថ្នាក់" value={classId} onChange={(event) => { setClassId(event.target.value); setPage(1) }} className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">គ្រប់ថ្នាក់</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.class_name}</option>)}</select>
          <select aria-label="ត្រងតាមភេទ" value={gender} onChange={(event) => { setGender(event.target.value); setPage(1) }} className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">គ្រប់ភេទ</option><option value="male">ប្រុស</option><option value="female">ស្រី</option><option value="other">ផ្សេងទៀត</option></select>
        </div>
        {loading ? <Loading label="កំពុងទាញយកបញ្ជីសិស្ស…" /> : <div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left text-sm"><thead className="border-b border-slate-200 text-xs text-slate-500"><tr>{['លេខសម្គាល់', 'ឈ្មោះសិស្ស', 'ភេទ', 'ថ្នាក់', 'ទូរស័ព្ទ', 'ស្ថានភាព', 'សកម្មភាព'].map((label) => <th key={label} className="px-3 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{items.map((student) => { const fullName = `${student.last_name} ${student.first_name}`; return <tr key={student.id}><td className="px-3 py-3 font-medium text-slate-700">{student.student_code}</td><td className="px-3 py-3"><div className="flex items-center gap-3"><StudentPhoto studentId={student.id} name={fullName} photo={student.photo} /><span className="font-semibold text-slate-800">{fullName}</span></div></td><td className="px-3 py-3 text-slate-600">{student.gender === 'male' ? 'ប្រុស' : student.gender === 'female' ? 'ស្រី' : 'ផ្សេងទៀត'}</td><td className="px-3 py-3 text-slate-600">{student.class_name}</td><td className="px-3 py-3 text-slate-600">{student.phone || '—'}</td><td className="px-3 py-3"><StatusBadge status={student.status} label={student.status === 'active' ? 'កំពុងសិក្សា' : 'ផ្អាក'} /></td><td className="px-3 py-3"><div className="flex items-center gap-1"><button type="button" title="មើលព័ត៌មាន" aria-label={`មើលព័ត៌មាន ${fullName}`} onClick={() => setViewing(student)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><Eye size={16} /></button>{user?.role === 'admin' && <><Link to={`/students/${student.id}/edit`} title="កែប្រែ" aria-label={`កែប្រែ ${fullName}`} className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><Pencil size={16} /></Link><button type="button" title="ចុះឈ្មោះមុខ" aria-label={`ចុះឈ្មោះមុខ ${fullName}`} onClick={() => navigate(`/face-registration?studentId=${student.id}`)} className="rounded-md p-2 text-emerald-800 hover:bg-emerald-50"><Camera size={16} /></button><button type="button" title="លុប" aria-label={`លុប ${fullName}`} onClick={() => setDeleting(student)} className="rounded-md p-2 text-rose-700 hover:bg-rose-50"><Trash2 size={16} /></button></>}</div></td></tr> })}</tbody></table>{items.length === 0 && <p className="py-12 text-center text-sm text-slate-500">មិនមានសិស្សត្រូវនឹងការស្វែងរកទេ។</p>}</div>}
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-500"><span>ទំព័រ {page.toLocaleString('km-KH')} / {totalPages.toLocaleString('km-KH')}</span><div className="flex gap-2"><Button variant="secondary" aria-label="ទំព័រមុន" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="px-2"><ChevronLeft size={17} /></Button><Button variant="secondary" aria-label="ទំព័របន្ទាប់" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)} className="px-2"><ChevronRight size={17} /></Button></div></div>
      </Card>
      <Modal open={Boolean(deleting)} title="បញ្ជាក់ការលុបសិស្ស" onClose={() => setDeleting(null)} footer={<><Button variant="secondary" onClick={() => setDeleting(null)}>បោះបង់</Button><Button variant="danger" disabled={busy} onClick={() => void removeStudent()}>{busy ? 'កំពុងលុប…' : 'លុបសិស្ស'}</Button></>}><p className="text-sm text-slate-600">តើអ្នកប្រាកដថាចង់លុប {deleting?.last_name} {deleting?.first_name} មែនទេ? ប្រវត្តិវត្តមានអាចរារាំងការលុប។</p></Modal>
      <Modal open={Boolean(viewing)} title="ព័ត៌មានសិស្ស" onClose={() => setViewing(null)} footer={<Button variant="secondary" onClick={() => setViewing(null)}>បិទ</Button>}>
        {viewing && <div className="space-y-3 text-sm text-slate-700"><div className="mb-4 flex items-center gap-4"><StudentPhoto studentId={viewing.id} name={`${viewing.last_name} ${viewing.first_name}`} photo={viewing.photo} size="size-16" /><div><p className="text-lg font-bold text-slate-900">{viewing.last_name} {viewing.first_name}</p><p className="text-slate-500">{viewing.student_code}</p></div></div><p><strong>ថ្នាក់៖</strong> {viewing.class_name}</p><p><strong>ភេទ៖</strong> {viewing.gender === 'male' ? 'ប្រុស' : viewing.gender === 'female' ? 'ស្រី' : 'ផ្សេងទៀត'}</p><p><strong>ថ្ងៃកំណើត៖</strong> {viewing.date_of_birth ?? 'មិនបានបញ្ចូល'}</p><p><strong>ទូរស័ព្ទ៖</strong> {viewing.phone ?? 'មិនបានបញ្ចូល'}</p><p><strong>អ៊ីមែល៖</strong> {viewing.email ?? 'មិនបានបញ្ចូល'}</p><p><strong>អាសយដ្ឋាន៖</strong> {viewing.address ?? 'មិនបានបញ្ចូល'}</p></div>}
      </Modal>
    </>
  )
}