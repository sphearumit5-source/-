import {
  Camera,
  GraduationCap,
  Phone,
  User,
} from 'lucide-react'
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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingClasses, setLoadingClasses] = useState(true)

  useEffect(() => {
    classesApi
      .list()
      .then((items) => {
        setClasses(items)
        if (!student && items.length) {
          setValues((current) => ({ ...current, class_id: items[0].id }))
        }
      })
      .catch((requestError) => setError(getApiError(requestError)))
      .finally(() => setLoadingClasses(false))
  }, [student])

  function update<K extends keyof StudentInput>(field: K, value: StudentInput[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handlePhotoSelect(file: File | undefined) {
    if (!file) {
      setPhoto(null)
      setPhotoPreview(null)
      return
    }
    setPhoto(file)
    const objectUrl = URL.createObjectURL(file)
    setPhotoPreview(objectUrl)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const saved = student
        ? await studentsApi.update(student.id, values)
        : await studentsApi.create(values)
      if (photo) await studentsApi.uploadPhoto(saved.id, photo)
      navigate('/students')
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setSaving(false)
    }
  }

  if (loadingClasses) return <Loading label="កំពុងទាញយកបញ្ជីថ្នាក់រៀន…" />

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Section 1: Academic & Identification */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <GraduationCap size={18} className="text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">ព័ត៌មានសិក្សា & អត្តសញ្ញាណ</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="លេខសម្គាល់សិស្ស (អត្តលេខ)"
            name="student_code"
            required
            placeholder="ឧទាហរណ៍៖ STU-2026-001"
            value={values.student_code}
            onChange={(event) => update('student_code', event.target.value)}
          />

          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            <span>
              ថ្នាក់រៀន <span className="text-rose-500">*</span>
            </span>
            <select
              required
              value={values.class_id || ''}
              onChange={(event) => update('class_id', Number(event.target.value))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 transition focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="" disabled>
                -- សូមជ្រើសរើសថ្នាក់រៀន --
              </option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.class_name} (ថ្នាក់ទី {item.grade})
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Section 2: Personal Profile */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <User size={18} className="text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">ព័ត៌មានផ្ទាល់ខ្លួន</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="នាមត្រកូល (Last Name)"
            name="last_name"
            required
            placeholder="បញ្ចូលនាមត្រកូល"
            value={values.last_name}
            onChange={(event) => update('last_name', event.target.value)}
          />

          <Input
            label="នាមខ្លួន (First Name)"
            name="first_name"
            required
            placeholder="បញ្ចូលនាមខ្លួន"
            value={values.first_name}
            onChange={(event) => update('first_name', event.target.value)}
          />

          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            <span>ភេទ</span>
            <select
              value={values.gender}
              onChange={(event) =>
                update('gender', event.target.value as StudentInput['gender'])
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 transition focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="male">ប្រុស</option>
              <option value="female">ស្រី</option>
              <option value="other">ផ្សេងទៀត</option>
            </select>
          </label>

          <Input
            label="ថ្ងៃខែឆ្នាំកំណើត"
            name="date_of_birth"
            type="date"
            value={values.date_of_birth ?? ''}
            onChange={(event) =>
              update('date_of_birth', event.target.value || null)
            }
          />
        </div>
      </div>

      {/* Section 3: Contact Details */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <Phone size={18} className="text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">ព័ត៌មានទំនាក់ទំនង</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="លេខទូរស័ព្ទ"
            name="phone"
            type="tel"
            placeholder="012 345 678"
            value={values.phone ?? ''}
            onChange={(event) => update('phone', event.target.value || null)}
          />

          <Input
            label="អ៊ីមែល"
            name="email"
            type="email"
            placeholder="student@example.com"
            value={values.email ?? ''}
            onChange={(event) => update('email', event.target.value || null)}
          />
        </div>

        <label className="block space-y-1.5 text-sm font-medium text-slate-700">
          <span>អាសយដ្ឋានបច្ចុប្បន្ន</span>
          <textarea
            rows={3}
            placeholder="បញ្ចូលអាសយដ្ឋានស្នាក់នៅ…"
            value={values.address ?? ''}
            onChange={(event) => update('address', event.target.value || null)}
            className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-800 transition focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
          />
        </label>
      </div>

      {/* Section 4: Photo Upload */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <Camera size={18} className="text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">រូបថតសិស្ស (សម្រាប់ប្រព័ន្ធ)</h3>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="Preview"
              className="size-20 rounded-2xl object-cover ring-2 ring-indigo-500 shadow-sm"
            />
          ) : (
            <div className="grid size-20 place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400">
              <Camera size={24} />
            </div>
          )}

          <div className="flex-1 min-w-[200px]">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => handlePhotoSelect(event.target.files?.[0])}
              className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-indigo-50 file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              គាំទ្ររូបភាពប្រភេទ JPG, PNG ឬ WEBP (ទំហំល្អបំផុត៖ រូបថតសំបុត្រ ឬ 4x6)
            </p>
          </div>
        </div>
      </div>

      {/* Status Checkbox if editing */}
      {student && (
        <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-800">
          <input
            type="checkbox"
            checked={values.status === 'active'}
            onChange={(event) =>
              update('status', event.target.checked ? 'active' : 'inactive')
            }
            className="size-4.5 rounded accent-indigo-600"
          />
          <span>សិស្សកំពុងសិក្សា (Active)</span>
        </label>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/students')}
        >
          បោះបង់
        </Button>
        <Button
          type="submit"
          disabled={saving || classes.length === 0}
        >
          {saving ? 'កំពុងរក្សាទុក…' : 'រក្សាទុកព័ត៌មាន'}
        </Button>
      </div>
    </form>
  )
}