import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, PageHeading } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { ErrorMessage, Loading } from '../../components/ui/Loading'
import { classesApi, getApiError } from '../../services/api'
import type { Classroom } from '../../types'

type ClassForm = Pick<Classroom, 'class_name' | 'grade' | 'section' | 'academic_year'>
const emptyForm: ClassForm = { class_name: '', grade: 10, section: 'A', academic_year: '2026-2027' }

export default function Classes() {
  const [classes, setClasses] = useState<Classroom[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Classroom | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<ClassForm>(emptyForm)
  const [confirmDelete, setConfirmDelete] = useState<Classroom | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setClasses(await classesApi.list(search)); setError('') }
    catch (requestError) { setError(getApiError(requestError)) }
    finally { setLoading(false) }
  }, [search])
  useEffect(() => { void load() }, [load])

  function beginCreate() { setEditing(null); setForm(emptyForm); setError(''); setFormOpen(true) }
  function beginEdit(classroom: Classroom) { setEditing(classroom); setForm({ class_name: classroom.class_name, grade: classroom.grade, section: classroom.section, academic_year: classroom.academic_year }); setError(''); setFormOpen(true) }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      if (editing) await classesApi.update(editing.id, form)
      else await classesApi.create(form)
      setFormOpen(false)
      setEditing(null)
      await load()
    } catch (requestError) { setError(getApiError(requestError)) }
    finally { setSaving(false) }
  }

  async function remove() {
    if (!confirmDelete) return
    try { await classesApi.remove(confirmDelete.id); setConfirmDelete(null); await load() }
    catch (requestError) { setError(getApiError(requestError)); setConfirmDelete(null) }
  }

  return <>
    <PageHeading title="គ្រប់គ្រងថ្នាក់រៀន" description={`${classes.length.toLocaleString('km-KH')} ថ្នាក់`} action={<Button onClick={beginCreate} icon={<Plus size={17} />}>បន្ថែមថ្នាក់</Button>} />
    {error && <div className="mb-4"><ErrorMessage>{error}</ErrorMessage></div>}
    <Card className="p-4 sm:p-5">
      <label className="relative mb-5 block max-w-md"><span className="sr-only">ស្វែងរកថ្នាក់</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ស្វែងរកឈ្មោះថ្នាក់" className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm" /></label>
      {loading ? <Loading label="កំពុងទាញយកថ្នាក់…" /> : <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left text-sm"><thead className="border-b border-slate-200 text-xs text-slate-500"><tr>{['ឈ្មោះថ្នាក់', 'កម្រិត', 'ផ្នែក', 'ឆ្នាំសិក្សា', 'ចំនួនសិស្ស', 'សកម្មភាព'].map((item) => <th key={item} className="px-3 py-3 font-medium">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{classes.map((classroom) => <tr key={classroom.id}><td className="px-3 py-4 font-semibold text-slate-800">{classroom.class_name}</td><td className="px-3 py-4 text-slate-600">ថ្នាក់ទី {classroom.grade.toLocaleString('km-KH')}</td><td className="px-3 py-4 text-slate-600">{classroom.section}</td><td className="px-3 py-4 text-slate-600">{classroom.academic_year}</td><td className="px-3 py-4 text-slate-600">{classroom.student_count.toLocaleString('km-KH')} នាក់</td><td className="px-3 py-4"><div className="flex gap-1"><button title="កែប្រែ" aria-label={`កែប្រែ ${classroom.class_name}`} onClick={() => beginEdit(classroom)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><Pencil size={16} /></button><button title="លុប" aria-label={`លុប ${classroom.class_name}`} onClick={() => setConfirmDelete(classroom)} className="rounded-md p-2 text-rose-700 hover:bg-rose-50"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table>{classes.length === 0 && <p className="py-12 text-center text-sm text-slate-500">មិនទាន់មានថ្នាក់រៀនទេ។</p>}</div>}
    </Card>
    <Modal open={formOpen} title={editing ? 'កែប្រែថ្នាក់រៀន' : 'បន្ថែមថ្នាក់រៀន'} onClose={() => setFormOpen(false)} footer={null}>
      <form onSubmit={save} className="space-y-4">
        <Input label="ឈ្មោះថ្នាក់" required value={form.class_name} onChange={(event) => setForm({ ...form, class_name: event.target.value })} />
        <div className="grid grid-cols-3 gap-3"><label className="space-y-1 text-sm font-medium text-slate-700"><span>កម្រិតថ្នាក់</span><input type="number" min={1} max={12} required value={form.grade} onChange={(event) => setForm({ ...form, grade: Number(event.target.value) })} className="h-11 w-full rounded-lg border border-slate-300 px-3" /></label><Input label="ផ្នែក" required value={form.section} onChange={(event) => setForm({ ...form, section: event.target.value })} /><Input label="ឆ្នាំសិក្សា" required value={form.academic_year} onChange={(event) => setForm({ ...form, academic_year: event.target.value })} /></div>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>បោះបង់</Button><Button type="submit" disabled={saving}>{saving ? 'កំពុងរក្សាទុក…' : 'រក្សាទុក'}</Button></div>
      </form>
    </Modal>
    <Modal open={Boolean(confirmDelete)} title="បញ្ជាក់ការលុបថ្នាក់" onClose={() => setConfirmDelete(null)} footer={<><Button variant="secondary" onClick={() => setConfirmDelete(null)}>បោះបង់</Button><Button variant="danger" onClick={() => void remove()}>លុបថ្នាក់</Button></>}><p className="text-sm text-slate-600">តើអ្នកប្រាកដថាចង់លុប {confirmDelete?.class_name} មែនទេ? ថ្នាក់ដែលមានសិស្សមិនអាចលុបបានទេ។</p></Modal>
  </>
}