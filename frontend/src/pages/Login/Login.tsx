import {
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  ScanFace,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
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
      setError(getApiError(requestError, 'មិនអាចចូលប្រព័ន្ធបានទេ។ សូមពិនិត្យឈ្មោះ និងពាក្យសម្ងាត់។'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[1.15fr_0.85fr]">
      {/* Left Feature Showcase Panel */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        {/* Decorative Grid & Lights */}
        <div
          className="absolute inset-0 opacity-15"
          aria-hidden="true"
          style={{
            backgroundImage: 'radial-gradient(#818cf8 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div
          className="animate-blob absolute -left-20 top-20 size-80 rounded-full bg-indigo-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="animate-floaty absolute -right-10 bottom-20 size-96 rounded-full bg-blue-500/20 blur-3xl"
          aria-hidden="true"
        />

        {/* Top Brand Logo */}
        <div className="relative z-10 flex animate-fade-down items-center gap-3.5">
          <span className="grid size-12 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md shadow-lg shadow-black/20">
            <GraduationCap size={26} className="text-indigo-300" />
          </span>
          <div>
            <span className="text-base font-bold tracking-tight text-white">
              ប្រព័ន្ធគ្រប់គ្រងសាលារៀន
            </span>
            <p className="text-xs text-indigo-300 font-medium">Smart Attendance & Student System</p>
          </div>
        </div>

        {/* Middle Feature Highlights */}
        <div className="relative z-10 my-auto max-w-xl py-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-200 backdrop-blur-md">
            <ScanFace size={14} className="text-amber-300" />
            <span>បច្ចេកវិទ្យា AI ស្កេនផ្ទៃមុខ</span>
          </div>

          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white tracking-tight sm:text-5xl">
            គ្រប់គ្រងសិស្ស និងវត្តមាន <br />
            <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
              ដោយស្វ័យប្រវត្ត & ឆ្លាតវៃ
            </span>
          </h1>

          <p className="mt-4 text-base leading-relaxed text-slate-300/90">
            ដំណោះស្រាយពេញលេញសម្រាប់ការកត់ត្រាវត្តមានសិស្ស គ្រប់គ្រងថ្នាក់រៀន
            និងបង្កើតរបាយការណ៍ស្ថិតិច្បាស់លាស់។
          </p>

          {/* 3 Value Proposition Cards */}
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md">
              <ScanFace size={20} className="text-indigo-400 mb-1.5" />
              <p className="text-xs font-bold text-white">ស្កេនលឿន ០.៥វិ</p>
              <p className="text-[11px] text-slate-400 mt-0.5">ស្គាល់មុខភ្លាមៗ</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md">
              <CheckCircle2 size={20} className="text-emerald-400 mb-1.5" />
              <p className="text-xs font-bold text-white">ភាពត្រឹមត្រូវ ៩៩%</p>
              <p className="text-[11px] text-slate-400 mt-0.5">ទិន្នន័យជាក់ស្តែង</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md">
              <ShieldCheck size={20} className="text-sky-400 mb-1.5" />
              <p className="text-xs font-bold text-white">សុវត្ថិភាពខ្ពស់</p>
              <p className="text-[11px] text-slate-400 mt-0.5">ការពារទិន្នន័យ</p>
            </div>
          </div>
        </div>

        {/* Bottom Tagline */}
        <div className="relative z-10 flex items-center justify-between text-xs text-indigo-300/70 border-t border-white/10 pt-4">
          <span>© ២០២៦ ប្រព័ន្ធគ្រប់គ្រងសិស្ស</span>
          <span>កំណែទម្រង់ ២.០ (AI Core)</span>
        </div>
      </section>

      {/* Right Login Form Panel */}
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md animate-fade-up">
          {/* Mobile Logo Brand */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/30">
              <GraduationCap size={22} />
            </span>
            <div>
              <p className="font-bold text-slate-900">ប្រព័ន្ធគ្រប់គ្រងសាលារៀន</p>
              <p className="text-xs text-slate-500">Smart Attendance AI</p>
            </div>
          </div>

          <div className="mb-8">
            <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              ប្រព័ន្ធសុវត្ថិភាព
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
              ចូលប្រើប្រាស់
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              សូមបញ្ចូលឈ្មោះគណនី និងពាក្យសម្ងាត់របស់អ្នកដើម្បីបន្ត។
            </p>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={submit}>
            <Input
              label="ឈ្មោះអ្នកប្រើប្រាស់"
              name="username"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="ឧទាហរណ៍៖ admin"
              icon={<UserRound size={17} />}
            />

            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              <span className="flex items-center justify-between">
                <span>
                  ពាក្យសម្ងាត់ <span className="text-rose-500">*</span>
                </span>
              </span>
              <div className="relative">
                <LockKeyhole
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={17}
                  aria-hidden="true"
                />
                <input
                  name="password"
                  autoComplete="current-password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="បញ្ចូលពាក្យសម្ងាត់"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-11 text-slate-900 transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'លាក់ពាក្យសម្ងាត់' : 'បង្ហាញពាក្យសម្ងាត់'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 active:scale-95"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error && (
              <p
                role="alert"
                className="animate-fade-up rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700"
              >
                {error}
              </p>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading}
                icon={
                  loading ? (
                    <span className="size-4 animate-spin-slow rounded-full border-2 border-white/30 border-t-white" />
                  ) : undefined
                }
              >
                {loading ? 'កំពុងផ្ទៀងផ្ទាត់…' : 'ចូលប្រព័ន្ធ'}
              </Button>
            </div>
          </form>

          <div className="mt-8 rounded-xl border border-slate-200/60 bg-slate-100/50 p-4 text-center text-xs text-slate-500">
            <p>បើមានបញ្ហាក្នុងការចូលប្រព័ន្ធ សូមទាក់ទងអ្នកគ្រប់គ្រងបច្ចេកវិទ្យាសាលា។</p>
          </div>
        </div>
      </section>
    </main>
  )
}
