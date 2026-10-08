import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Loading } from '../ui/Loading'
import { classesApi, getApiError, studentsApi } from '../../services/api'
import type { Classroom, Student, StudentInput } from '../../types'

export function StudentForm({ student }: { student?: Student }) {
  const navigate = useNavigate()
  const [classes, setClasses] = useState<Classroom[]>([])
  const [values, setValues] = useState<StudentInput>({
    student_code: student?.student_code ?? '',
    first_name: student?.first_name ?? '',
    last_name: student?.last_name ?? '',
    gender: student?.gender ?? 'male',
    date_of_birth: student?.date_of_birth ?? null,
    phone: student?.phone ?? null,
    email: student?.email ?? null,
    address: student?.address ?? null,
    class_id: student?.class_id ?? 0,
    status: student?.status ?? 'active',
  })
  const [photo, setPhoto] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingClasses, setLoadingClasses] = useState(true)

  useEffect(() => {
    classesApi.list().then((items) => {
      setClasses(items)
      if (!student && items.length) setValues((current) => ({ ...current, class_id: items[0].id }))
    }).catch((requestError) => setError(getApiError(requestError))).finally(() => setLoadingClasses(false))
  }, [student])

  function update<K extends keyof StudentInput>(field: K, value: StudentInput[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const saved = student ? await studentsApi.update(student.id, values) : await studentsApi.create(values)
      if (photo) await studentsApi.uploadPhoto(saved.id, photo)
      navigate('/students')
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setSaving(false)
    }
  }

  if (loadingClasses) return <Loading label="កំពុងទាញយកថ្នាក់…" />

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="លេខសម្គាល់សិស្ស" name="student_code" required value={values.student_code} onChange={(event) => update('student_code', event.target.value)} />
        <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>ថ្នាក់រៀន</span><select required value={values.class_id || ''} onChange={(event) => update('class_id', Number(event.target.value))} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="" disabled>ជ្រើសរើសថ្នាក់</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.class_name}</option>)}</select></label>
        <Input label="នាមត្រកូល" name="last_name" required value={values.last_name} onChange={(event) => update('last_name', event.target.value)} />
        <Input label="នាមខ្លួន" name="first_name" required value={values.first_name} onChange={(event) => update('first_name', event.target.value)} />
        <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>ភេទ</span><select value={values.gender} onChange={(event) => update('gender', event.target.value as StudentInput['gender'])} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="male">ប្រុស</option><option value="female">ស្រី</option><option value="other">ផ្សេងទៀត</option></select></label>
        <Input label="ថ្ងៃខែឆ្នាំកំណើត" name="date_of_birth" type="date" value={values.date_of_birth ?? ''} onChange={(event) => update('date_of_birth', event.target.value || null)} />
        <Input label="លេខទូរស័ព្ទ" name="phone" type="tel" value={values.phone ?? ''} onChange={(event) => update('phone', event.target.value || null)} />
        <Input label="អ៊ីមែល" name="email" type="email" value={values.email ?? ''} onChange={(event) => update('email', event.target.value || null)} />
      </div>
      <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>អាសយដ្ឋាន</span><textarea rows={3} value={values.address ?? ''} onChange={(event) => update('address', event.target.value || null)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
      <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>រូបថត</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
      {student && <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={values.status === 'active'} onChange={(event) => update('status', event.target.checked ? 'active' : 'inactive')} className="size-4 accent-blue-700" />សិស្សកំពុងសិក្សា</label>}
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4"><Button type="button" variant="secondary" onClick={() => navigate('/students')}>បោះបង់</Button><Button type="submit" disabled={saving || classes.length === 0}>{saving ? 'កំពុងរក្សាទុក…' : 'រក្សាទុក'}</Button></div>
    </form>
  )
}