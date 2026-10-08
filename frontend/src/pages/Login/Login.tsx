import { Eye, EyeOff, GraduationCap, LockKeyhole, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../hooks/useAuth'
import { getApiError } from '../../services/api'

export default function Login() {
  const { user, ready, signIn } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (ready && user) return <Navigate to="/dashboard" replace />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(username.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (requestError) {
      setError(getApiError(requestError, 'មិនអាចចូលប្រព័ន្ធបានទេ។'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f4f7f6] lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden bg-[#174ea6] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-20" aria-hidden="true" style={{ backgroundImage: 'radial-gradient(#dbeafe 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative flex items-center gap-3"><span className="grid size-12 place-items-center rounded-xl bg-white/15"><GraduationCap size={25} /></span><span className="font-semibold">ប្រព័ន្ធគ្រប់គ្រងសាលារៀន</span></div>
        <div className="relative max-w-2xl pb-12">
          <p className="mb-4 text-sm font-semibold text-blue-100">សម្រាប់ការគ្រប់គ្រងសិក្សាប្រចាំថ្ងៃ</p>
          <h1 className="text-4xl font-bold leading-relaxed">គ្រប់គ្រងសិស្ស<br />និងវត្តមានដោយភាពងាយស្រួល</h1>
          <p className="mt-5 max-w-lg text-base leading-8 text-blue-50/85">ប្រព័ន្ធកត់ត្រាវត្តមានតាមការស្គាល់មុខ និងគ្រប់គ្រងព័ត៌មានសាលារៀននៅកន្លែងតែមួយ។</p>
        </div>
        <p className="relative text-xs text-blue-100/80">សុវត្ថិភាពទិន្នន័យសិស្សគឺជាអាទិភាព</p>
      </section>
      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="mb-9 flex items-center gap-3 lg:hidden"><span className="grid size-11 place-items-center rounded-xl bg-blue-700 text-white"><GraduationCap /></span><span className="font-semibold text-slate-800">ប្រព័ន្ធគ្រប់គ្រងសាលារៀន</span></div>
          <p className="text-sm font-semibold text-blue-800">សូមស្វាគមន៍</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">ចូលប្រព័ន្ធ</h2>
          <p className="mt-2 text-sm text-slate-600">បញ្ចូលព័ត៌មានគណនីរបស់អ្នកដើម្បីបន្ត។</p>
          <form className="mt-8 space-y-5" onSubmit={submit}>
            <Input label="ឈ្មោះអ្នកប្រើប្រាស់" name="username" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="បញ្ចូលឈ្មោះអ្នកប្រើប្រាស់" />
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              <span>ពាក្យសម្ងាត់</span>
              <span className="relative block">
                <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} aria-hidden="true" />
                <input name="password" autoComplete="current-password" required type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="បញ្ចូលពាក្យសម្ងាត់" className="min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-12 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15" />
                <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'លាក់ពាក្យសម្ងាត់' : 'បង្ហាញពាក្យសម្ងាត់'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-2 text-slate-500 hover:bg-slate-100">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </span>
            </label>
            {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading} icon={<UserRound size={17} />}>{loading ? 'កំពុងចូល…' : 'ចូលប្រព័ន្ធ'}</Button>
          </form>
          <p className="mt-8 text-center text-xs text-slate-500">បើមានបញ្ហាចូលប្រព័ន្ធ សូមទាក់ទងអ្នកគ្រប់គ្រង។</p>
        </div>
      </section>
    </main>
  )
}