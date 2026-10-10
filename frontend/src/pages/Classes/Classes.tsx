import {
  GraduationCap,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, PageHeading } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ErrorMessage, Loading } from '../../components/ui/Loading'
import { Modal } from '../../components/ui/Modal'
import { classesApi, getApiError } from '../../services/api'
import type { Classroom } from '../../types'

type ClassForm = Pick<Classroom, 'class_name' | 'grade' | 'section' | 'academic_year'>
const emptyForm: ClassForm = {
  class_name: '',
  grade: 10,
  section: 'A',
  academic_year: '2026-2027',
}

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
    try {
      setClasses(await classesApi.list(search))
      setError('')
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    void load()
  }, [load])

  function beginCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setFormOpen(true)
  }

  function beginEdit(classroom: Classroom) {
    setEditing(classroom)
    setForm({
      class_name: classroom.class_name,
      grade: classroom.grade,
      section: classroom.section,
      academic_year: classroom.academic_year,
    })
    setError('')
    setFormOpen(true)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      if (editing) await classesApi.update(editing.id, form)
      else await classesApi.create(form)
      setFormOpen(false)
      setEditing(null)
      await load()
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!confirmDelete) return
    try {
      await classesApi.remove(confirmDelete.id)
      setConfirmDelete(null)
      await load()
    } catch (requestError) {
      setError(getApiError(requestError))
      setConfirmDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="គ្រប់គ្រងថ្នាក់រៀន"
        description={`ថ្នាក់រៀនសរុបទាំងអស់ចំនួន ${classes.length.toLocaleString('km-KH')} ថ្នាក់`}
        action={
          <Button onClick={beginCreate} icon={<Plus size={18} />}>
            បន្ថែមថ្នាក់រៀនថ្មី
          </Button>
        }
      />

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <Card className="p-5 sm:p-6">
        <div className="mb-6 max-w-md">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ស្វែងរកតាមឈ្មោះថ្នាក់…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm transition placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>
        </div>

        {loading ? (
          <Loading label="កំពុងទាញយកបញ្ជីថ្នាក់រៀន…" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-slate-200/80 bg-slate-50/75 text-xs font-semibold text-slate-500">
                <tr>
                  {[
                    'ឈ្មោះថ្នាក់',
                    'កម្រិតថ្នាក់',
                    'ផ្នែក / បន្ទប់',
                    'ឆ្នាំសិក្សា',
                    'ចំនួនសិស្ស',
                    'សកម្មភាព',
                  ].map((item) => (
                    <th key={item} className="px-4 py-3.5 font-semibold">
                      {item}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {classes.map((classroom) => (
                  <tr
                    key={classroom.id}
                    className="transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                          <GraduationCap size={16} />
                        </span>
                        <span className="font-bold text-slate-900">
                          {classroom.class_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-medium">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        ថ្នាក់ទី {classroom.grade.toLocaleString('km-KH')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-600">
                      {classroom.section}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-medium">
                      {classroom.academic_year}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 font-bold">
                      <span className="inline-flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full font-semibold">
                        <Users size={13} />
                        {classroom.student_count.toLocaleString('km-KH')} នាក់
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="កែប្រែ"
                          aria-label={`កែប្រែ ${classroom.class_name}`}
                          onClick={() => beginEdit(classroom)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition"
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          type="button"
                          title="លុប"
                          aria-label={`លុប ${classroom.class_name}`}
                          onClick={() => setConfirmDelete(classroom)}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {classes.length === 0 && (
              <div className="py-14 text-center">
                <GraduationCap size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-500">
                  មិនទាន់មានថ្នាក់រៀនត្រូវបានបង្កើតនៅឡើយទេ។
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Class Create / Edit Modal */}
      <Modal
        open={formOpen}
        title={editing ? 'កែប្រែថ្នាក់រៀន' : 'បន្ថែមថ្នាក់រៀនថ្មី'}
        onClose={() => setFormOpen(false)}
        footer={null}
      >
        <form onSubmit={save} className="space-y-4">
          <Input
            label="ឈ្មោះថ្នាក់រៀន"
            required
            placeholder="ឧទាហរណ៍៖ 10A ឬ ថ្នាក់ទី១០ ក"
            value={form.class_name}
            onChange={(event) =>
              setForm({ ...form, class_name: event.target.value })
            }
          />

          <div className="grid grid-cols-3 gap-3">
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              <span>កម្រិតថ្នាក់ (1-12)</span>
              <input
                type="number"
                min={1}
                max={12}
                required
                value={form.grade}
                onChange={(event) =>
                  setForm({ ...form, grade: Number(event.target.value) })
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold transition focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              />
            </label>

            <Input
              label="ផ្នែក / បន្ទប់"
              required
              placeholder="A, B, C…"
              value={form.section}
              onChange={(event) => setForm({ ...form, section: event.target.value })}
            />

            <Input
              label="ឆ្នាំសិក្សា"
              required
              placeholder="2026-2027"
              value={form.academic_year}
              onChange={(event) =>
                setForm({ ...form, academic_year: event.target.value })
              }
            />
          </div>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setFormOpen(false)}
            >
              បោះបង់
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'កំពុងរក្សាទុក…' : 'រក្សាទុកថ្នាក់រៀន'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(confirmDelete)}
        title="បញ្ជាក់ការលុបថ្នាក់រៀន"
        onClose={() => setConfirmDelete(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              បោះបង់
            </Button>
            <Button variant="danger" onClick={() => void remove()}>
              លុបថ្នាក់រៀន
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          តើអ្នកពិតជាចង់លុបថ្នាក់{' '}
          <strong>{confirmDelete?.class_name}</strong> ចេញពីប្រព័ន្ធមែនទេ?
        </p>
        <p className="mt-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
          ចំណាំ៖ ថ្នាក់រៀនដែលមានសិស្សកំពុងសិក្សា មិនអាចលុបបានឡើយ។
        </p>
      </Modal>
    </div>
  )
}