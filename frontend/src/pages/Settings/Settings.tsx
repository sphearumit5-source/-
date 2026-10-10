import {
  Clock,
  GraduationCap,
  ImagePlus,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UsersRound,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, PageHeading } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ErrorMessage, Loading, SuccessMessage } from '../../components/ui/Loading'
import { Modal } from '../../components/ui/Modal'
import { getApiError, settingsApi, usersApi } from '../../services/api'
import type { SchoolSettings, User as UserType } from '../../types'

const defaults: SchoolSettings = {
  school_name: 'សាលារៀន',
  logo_path: null,
  school_start_time: '07:00',
  late_after_time: '08:00',
  school_days_per_week: 6,
}

export default function Settings() {
  const [values, setValues] = useState<SchoolSettings>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [users, setUsers] = useState<UserType[]>([])
  const [userFormOpen, setUserFormOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    username: '',
    full_name: '',
    password: '',
    role: 'teacher' as UserType['role'],
  })
  const [savingUser, setSavingUser] = useState(false)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const [userEdit, setUserEdit] = useState({
    full_name: '',
    password: '',
    role: 'teacher' as UserType['role'],
  })

  useEffect(() => {
    Promise.all([settingsApi.get(), usersApi.list()])
      .then(([nextSettings, nextUsers]) => {
        setValues(nextSettings)
        setUsers(nextUsers)
      })
      .catch((requestError) => setError(getApiError(requestError)))
      .finally(() => setLoading(false))
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      setValues(await settingsApi.update(values))
      setSaved(true)
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingUser(true)
    setError('')
    try {
      await usersApi.create(newUser)
      setUsers(await usersApi.list())
      setNewUser({
        username: '',
        full_name: '',
        password: '',
        role: 'teacher',
      })
      setUserFormOpen(false)
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setSavingUser(false)
    }
  }

  async function deleteUser(targetUser: UserType) {
    if (!window.confirm(`តើអ្នកប្រាកដថាចង់លុបគណនី ${targetUser.full_name} មែនទេ?`))
      return
    try {
      await usersApi.remove(targetUser.id)
      setUsers(await usersApi.list())
    } catch (requestError) {
      setError(getApiError(requestError))
    }
  }

  function beginEditUser(targetUser: UserType) {
    setEditingUser(targetUser)
    setUserEdit({
      full_name: targetUser.full_name,
      password: '',
      role: targetUser.role,
    })
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingUser) return
    setSavingUser(true)
    setError('')
    try {
      const payload = {
        full_name: userEdit.full_name,
        role: userEdit.role,
        ...(userEdit.password ? { password: userEdit.password } : {}),
      }
      await usersApi.update(editingUser.id, payload)
      setUsers(await usersApi.list())
      setEditingUser(null)
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setSavingUser(false)
    }
  }

  async function uploadLogo(file: File | undefined) {
    if (!file) return
    try {
      setValues(await settingsApi.uploadLogo(file))
      setSaved(true)
      setError('')
    } catch (requestError) {
      setError(getApiError(requestError))
    }
  }

  if (loading) return <Loading label="កំពុងទាញយកការកំណត់ប្រព័ន្ធ…" />

  return (
    <div className="space-y-6">
      <PageHeading
        title="ការកំណត់ប្រព័ន្ធ"
        description="គ្រប់គ្រងព័ត៌មានទូទៅរបស់សាលា ម៉ោងសិក្សា និងគណនីអ្នកប្រើប្រាស់។"
      />

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {saved && <SuccessMessage>បានរក្សាទុកការកំណត់ដោយជោគជ័យ!</SuccessMessage>}

      {/* School Information & Attendance Schedule */}
      <Card className="max-w-4xl p-5 sm:p-7">
        <form onSubmit={submit} className="space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <GraduationCap size={20} className="text-indigo-600" />
            <div>
              <h2 className="font-bold text-slate-900 text-base">ព័ត៌មានទូទៅរបស់សាលា</h2>
              <p className="text-xs text-slate-500">ឈ្មោះ និងស្លាកសញ្ញាសម្គាល់សាលារៀន</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="ឈ្មោះសាលារៀន"
              required
              maxLength={160}
              placeholder="ឧទាហរណ៍៖ វិទ្យាល័យ ហ៊ុន សែន…"
              value={values.school_name}
              onChange={(event) =>
                setValues({ ...values, school_name: event.target.value })
              }
            />

            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              <span>ស្លាកសញ្ញាសាលា (Logo)</span>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => void uploadLogo(event.target.files?.[0])}
                  className="block flex-1 rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <span className="rounded-lg bg-slate-100 p-2 text-slate-500">
                  <ImagePlus size={18} />
                </span>
              </div>
              <span className="text-[11px] font-normal text-slate-400">
                {values.logo_path
                  ? '✓ មាន Logo ត្រូវបានរក្សាទុករួចហើយ'
                  : 'មិនទាន់មាន Logo នៅឡើយទេ'}
              </span>
            </label>
          </div>

          {/* Schedule Settings */}
          <div className="pt-2">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Clock size={20} className="text-indigo-600" />
              <div>
                <h2 className="font-bold text-slate-900 text-base">
                  ម៉ោងកត់វត្តមាន និងកាលវិភាគ
                </h2>
                <p className="text-xs text-slate-500">
                  កំណត់ម៉ោងចូលរៀន និងលក្ខខណ្ឌកំណត់សិស្សមកយឺត
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                <span>ម៉ោងចូលរៀន</span>
                <input
                  type="time"
                  required
                  value={values.school_start_time.slice(0, 5)}
                  onChange={(event) =>
                    setValues({
                      ...values,
                      school_start_time: event.target.value,
                    })
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm font-bold text-slate-800 transition focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </label>

              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                <span>ចាប់ផ្ដើមរាប់ថា "មកយឺត"</span>
                <input
                  type="time"
                  required
                  value={values.late_after_time.slice(0, 5)}
                  onChange={(event) =>
                    setValues({
                      ...values,
                      late_after_time: event.target.value,
                    })
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm font-bold text-amber-700 transition focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </label>

              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                <span>ថ្ងៃសិក្សាក្នុងមួយសប្ដាហ៍</span>
                <input
                  type="number"
                  min={1}
                  max={7}
                  required
                  value={values.school_days_per_week}
                  onChange={(event) =>
                    setValues({
                      ...values,
                      school_days_per_week: Number(event.target.value),
                    })
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm font-bold text-slate-800 transition focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-5">
            <Button
              type="submit"
              disabled={saving}
              icon={<Save size={16} />}
            >
              {saving ? 'កំពុងរក្សាទុក…' : 'រក្សាទុកការកំណត់'}
            </Button>
          </div>
        </form>
      </Card>

      {/* User Management Section */}
      <Card className="max-w-4xl p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <UsersRound size={20} />
            </span>
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                គ្រប់គ្រងអ្នកប្រើប្រាស់ & សិទ្ធិ
              </h2>
              <p className="text-xs text-slate-500">គណនីអ្នកគ្រប់គ្រង និងគ្រូបង្រៀន</p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => setUserFormOpen((open) => !open)}
            icon={<Plus size={16} />}
          >
            {userFormOpen ? 'បិទផ្ទាំង' : 'បន្ថែមអ្នកប្រើប្រាស់'}
          </Button>
        </div>

        {/* Add User Form Drawer/Box */}
        {userFormOpen && (
          <form
            onSubmit={addUser}
            className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 space-y-4 animate-scale-in"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-800">
              បង្កើតគណនីអ្នកប្រើប្រាស់ថ្មី
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="ឈ្មោះគណនី (Username)"
                minLength={3}
                required
                placeholder="teacher01"
                value={newUser.username}
                onChange={(event) =>
                  setNewUser({ ...newUser, username: event.target.value })
                }
              />
              <Input
                label="ឈ្មោះពេញ (Full Name)"
                required
                placeholder="លោកគ្រូ / អ្នកគ្រូ…"
                value={newUser.full_name}
                onChange={(event) =>
                  setNewUser({ ...newUser, full_name: event.target.value })
                }
              />
              <Input
                label="ពាក្យសម្ងាត់ (យ៉ាងតិច ១២ តួ)"
                type="password"
                minLength={12}
                required
                placeholder="••••••••••••"
                value={newUser.password}
                onChange={(event) =>
                  setNewUser({ ...newUser, password: event.target.value })
                }
              />
              <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                <span>តួនាទី / សិទ្ធិ</span>
                <select
                  value={newUser.role}
                  onChange={(event) =>
                    setNewUser({
                      ...newUser,
                      role: event.target.value as UserType['role'],
                    })
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold transition focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                >
                  <option value="teacher">គ្រូបង្រៀន (Teacher)</option>
                  <option value="admin">អ្នកគ្រប់គ្រង (Admin)</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={savingUser}>
                {savingUser ? 'កំពុងបង្កើត…' : 'បង្កើតគណនីថ្មី'}
              </Button>
            </div>
          </form>
        )}

        {/* User Accounts List */}
        <div className="mt-5 divide-y divide-slate-100">
          {users.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 py-3.5 transition hover:bg-slate-50/60 px-2 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-slate-100 font-bold text-xs text-slate-700">
                  {item.full_name.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{item.full_name}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span className="font-mono">{item.username}</span>
                    <span>•</span>
                    {item.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 font-bold text-indigo-600">
                        <ShieldCheck size={13} />
                        អ្នកគ្រប់គ្រង
                      </span>
                    ) : (
                      <span className="text-slate-600 font-medium">គ្រូបង្រៀន</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="កែប្រែ"
                  aria-label={`កែប្រែ ${item.full_name}`}
                  onClick={() => beginEditUser(item)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  title="លុប"
                  aria-label={`លុប ${item.full_name}`}
                  onClick={() => void deleteUser(item)}
                  className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Edit User Modal */}
      <Modal
        open={Boolean(editingUser)}
        title="កែប្រែព័ត៌មានអ្នកប្រើប្រាស់"
        onClose={() => setEditingUser(null)}
        footer={null}
      >
        <form onSubmit={saveUser} className="space-y-4">
          <p className="text-xs text-slate-500 font-mono">
            ឈ្មោះគណនី៖ <strong>{editingUser?.username}</strong>
          </p>
          <Input
            label="ឈ្មោះពេញ"
            required
            value={userEdit.full_name}
            onChange={(event) =>
              setUserEdit({ ...userEdit, full_name: event.target.value })
            }
          />
          <Input
            label="ពាក្យសម្ងាត់ថ្មី (ទុកទទេបើមិនចង់ប្តូរ)"
            type="password"
            minLength={12}
            placeholder="••••••••••••"
            value={userEdit.password}
            onChange={(event) =>
              setUserEdit({ ...userEdit, password: event.target.value })
            }
          />
          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            <span>តួនាទី / សិទ្ធិ</span>
            <select
              value={userEdit.role}
              onChange={(event) =>
                setUserEdit({
                  ...userEdit,
                  role: event.target.value as UserType['role'],
                })
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold transition focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="teacher">គ្រូបង្រៀន (Teacher)</option>
              <option value="admin">អ្នកគ្រប់គ្រង (Admin)</option>
            </select>
          </label>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingUser(null)}
            >
              បោះបង់
            </Button>
            <Button type="submit" disabled={savingUser}>
              {savingUser ? 'កំពុងរក្សាទុក…' : 'រក្សាទុកការកែប្រែ'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}