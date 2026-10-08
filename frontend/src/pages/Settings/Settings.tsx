import { ImagePlus, Pencil, Plus, Save, Trash2, UsersRound } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, PageHeading } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ErrorMessage, Loading } from '../../components/ui/Loading'
import { Modal } from '../../components/ui/Modal'
import { getApiError, settingsApi, usersApi } from '../../services/api'
import type { SchoolSettings } from '../../types'
import type { User } from '../../types'

const defaults: SchoolSettings = { school_name: 'សាលារៀន', logo_path: null, school_start_time: '07:00', late_after_time: '08:00', school_days_per_week: 6 }

export default function Settings() {
  const [values, setValues] = useState<SchoolSettings>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [userFormOpen, setUserFormOpen] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', full_name: '', password: '', role: 'teacher' as User['role'] })
  const [savingUser, setSavingUser] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userEdit, setUserEdit] = useState({ full_name: '', password: '', role: 'teacher' as User['role'] })

  useEffect(() => {
    Promise.all([settingsApi.get(), usersApi.list()]).then(([nextSettings, nextUsers]) => { setValues(nextSettings); setUsers(nextUsers) }).catch((requestError) => setError(getApiError(requestError))).finally(() => setLoading(false))
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setSaved(false)
    setError('')
    try { setValues(await settingsApi.update(values)); setSaved(true) }
    catch (requestError) { setError(getApiError(requestError)) }
    finally { setSaving(false) }
  }

  async function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingUser(true)
    setError('')
    try { await usersApi.create(newUser); setUsers(await usersApi.list()); setNewUser({ username: '', full_name: '', password: '', role: 'teacher' }); setUserFormOpen(false) }
    catch (requestError) { setError(getApiError(requestError)) }
    finally { setSavingUser(false) }
  }

  async function deleteUser(user: User) {
    if (!window.confirm(`តើអ្នកប្រាកដថាចង់លុបគណនី ${user.full_name} មែនទេ?`)) return
    try { await usersApi.remove(user.id); setUsers(await usersApi.list()) }
    catch (requestError) { setError(getApiError(requestError)) }
  }

  function beginEditUser(user: User) {
    setEditingUser(user)
    setUserEdit({ full_name: user.full_name, password: '', role: user.role })
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
    } catch (requestError) { setError(getApiError(requestError)) }
    finally { setSavingUser(false) }
  }

  async function uploadLogo(file: File | undefined) {
    if (!file) return
    try { setValues(await settingsApi.uploadLogo(file)); setSaved(true); setError('') }
    catch (requestError) { setError(getApiError(requestError)) }
  }

  if (loading) return <Loading label="កំពុងទាញយកការកំណត់…" />
  return <>
    <PageHeading title="ការកំណត់" description="គ្រប់គ្រងព័ត៌មានសាលា និងម៉ោងកត់វត្តមាន។" />
    {error && <div className="mb-4"><ErrorMessage>{error}</ErrorMessage></div>}
    <Card className="max-w-3xl p-5 sm:p-7"><form onSubmit={submit} className="space-y-5">
      <div><h2 className="font-bold text-slate-900">ព័ត៌មានសាលា</h2><p className="mt-1 text-sm text-slate-500">ព័ត៌មានទាំងនេះត្រូវរក្សាទុកក្នុងម៉ាស៊ីនមេ។</p></div>
      <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>ឈ្មោះសាលា</span><input required maxLength={160} value={values.school_name} onChange={(event) => setValues({ ...values, school_name: event.target.value })} className="h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
      <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>Logo សាលា</span><span className="flex flex-wrap items-center gap-3"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadLogo(event.target.files?.[0])} className="block min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /><ImagePlus className="text-slate-500" size={19} /></span><span className="text-xs font-normal text-slate-500">{values.logo_path ? 'មាន Logo បានរក្សាទុករួចហើយ' : 'មិនទាន់មាន Logo'}</span></label>
      <div className="grid gap-4 sm:grid-cols-3"><label className="space-y-1.5 text-sm font-medium text-slate-700"><span>ម៉ោងចូលរៀន</span><input type="time" required value={values.school_start_time.slice(0, 5)} onChange={(event) => setValues({ ...values, school_start_time: event.target.value })} className="h-11 w-full rounded-lg border border-slate-300 px-3" /></label><label className="space-y-1.5 text-sm font-medium text-slate-700"><span>ចាប់ផ្ដើមមកយឺត</span><input type="time" required value={values.late_after_time.slice(0, 5)} onChange={(event) => setValues({ ...values, late_after_time: event.target.value })} className="h-11 w-full rounded-lg border border-slate-300 px-3" /></label><label className="space-y-1.5 text-sm font-medium text-slate-700"><span>ថ្ងៃសិក្សាក្នុងមួយសប្ដាហ៍</span><input type="number" min={1} max={7} required value={values.school_days_per_week} onChange={(event) => setValues({ ...values, school_days_per_week: Number(event.target.value) })} className="h-11 w-full rounded-lg border border-slate-300 px-3" /></label></div>
      {saved && <p role="status" className="text-sm font-medium text-emerald-800">បានរក្សាទុកការកំណត់។</p>}
      <div className="flex justify-end border-t border-slate-200 pt-4"><Button type="submit" disabled={saving} icon={<Save size={17} />}>{saving ? 'កំពុងរក្សាទុក…' : 'រក្សាទុកការកំណត់'}</Button></div>
    </form></Card>
    <Card className="mt-5 max-w-3xl p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-bold text-slate-900"><UsersRound size={19} />គ្រប់គ្រងអ្នកប្រើប្រាស់</h2><p className="mt-1 text-sm text-slate-500">អ្នកគ្រប់គ្រង និងគ្រូបង្រៀន</p></div><Button onClick={() => setUserFormOpen((open) => !open)} icon={<Plus size={17} />}>{userFormOpen ? 'បោះបង់' : 'បន្ថែមអ្នកប្រើប្រាស់'}</Button></div>
      {userFormOpen && <form onSubmit={addUser} className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"><Input label="ឈ្មោះអ្នកប្រើប្រាស់" minLength={3} required value={newUser.username} onChange={(event) => setNewUser({ ...newUser, username: event.target.value })} /><Input label="ឈ្មោះពេញ" required value={newUser.full_name} onChange={(event) => setNewUser({ ...newUser, full_name: event.target.value })} /><Input label="ពាក្យសម្ងាត់ (យ៉ាងតិច ១២ តួ)" type="password" minLength={12} required value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} /><label className="space-y-1.5 text-sm font-medium text-slate-700"><span>តួនាទី</span><select value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value as User['role'] })} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="teacher">គ្រូបង្រៀន</option><option value="admin">អ្នកគ្រប់គ្រង</option></select></label><div className="sm:col-span-2"><Button type="submit" disabled={savingUser}>{savingUser ? 'កំពុងបង្កើត…' : 'បង្កើតគណនី'}</Button></div></form>}
      <div className="mt-5 divide-y divide-slate-100">{users.map((user) => <div key={user.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-semibold text-slate-800">{user.full_name}</p><p className="text-xs text-slate-500">{user.username} · {user.role === 'admin' ? 'អ្នកគ្រប់គ្រង' : 'គ្រូបង្រៀន'}</p></div><div className="flex gap-1"><button type="button" title="កែប្រែអ្នកប្រើប្រាស់" aria-label={`កែប្រែ ${user.full_name}`} onClick={() => beginEditUser(user)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><Pencil size={16} /></button><button type="button" title="លុបអ្នកប្រើប្រាស់" aria-label={`លុប ${user.full_name}`} onClick={() => void deleteUser(user)} className="rounded-md p-2 text-rose-700 hover:bg-rose-50"><Trash2 size={16} /></button></div></div>)}</div>
    </Card>
    <Modal open={Boolean(editingUser)} title="កែប្រែអ្នកប្រើប្រាស់" onClose={() => setEditingUser(null)} footer={null}>
      <form onSubmit={saveUser} className="space-y-4">
        <p className="text-sm text-slate-500">ឈ្មោះគណនី៖ {editingUser?.username}</p>
        <Input label="ឈ្មោះពេញ" required value={userEdit.full_name} onChange={(event) => setUserEdit({ ...userEdit, full_name: event.target.value })} />
        <Input label="ពាក្យសម្ងាត់ថ្មី (ទុកទទេបើមិនប្ដូរ)" type="password" minLength={12} value={userEdit.password} onChange={(event) => setUserEdit({ ...userEdit, password: event.target.value })} />
        <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>តួនាទី</span><select value={userEdit.role} onChange={(event) => setUserEdit({ ...userEdit, role: event.target.value as User['role'] })} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="teacher">គ្រូបង្រៀន</option><option value="admin">អ្នកគ្រប់គ្រង</option></select></label>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>បោះបង់</Button><Button type="submit" disabled={savingUser}>{savingUser ? 'កំពុងរក្សាទុក…' : 'រក្សាទុក'}</Button></div>
      </form>
    </Modal>
  </>
}