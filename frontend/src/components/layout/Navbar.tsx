import { Calendar, LogOut, Menu, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

export function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, signOut } = useAuth()
  const [time, setTime] = useState('')

  useEffect(() => {
    function updateClock() {
      const now = new Date()
      setTime(
        now.toLocaleTimeString('km-KH', {
          hour: '2-digit',
          minute: '2-digit',
        })
      )
    }
    updateClock()
    const timer = setInterval(updateClock, 30000)
    return () => clearInterval(timer)
  }, [])

  const initials = (user?.full_name ?? '?').trim().charAt(0).toUpperCase()
  const todayKhmer = new Date().toLocaleDateString('km-KH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <header className="glass sticky top-0 z-30 flex h-18 items-center justify-between border-b border-slate-200/70 px-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:px-8">
      {/* Mobile Menu & Date Info */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="បើកម៉ឺនុយ"
          className="rounded-xl border border-slate-200/80 bg-white p-2 text-slate-600 shadow-2xs transition hover:bg-slate-50 active:scale-95 lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="hidden items-center gap-2 rounded-full border border-slate-200/60 bg-white/70 px-3 py-1.5 text-xs text-slate-600 shadow-2xs sm:flex">
          <Calendar size={14} className="text-indigo-600" />
          <span className="font-medium text-slate-700">{todayKhmer}</span>
          <span className="text-slate-300">•</span>
          <span className="font-semibold text-slate-900">{time}</span>
        </div>
      </div>

      {/* Right Controls & User Info */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* User Card */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white/80 py-1.5 pl-3 pr-2 shadow-2xs">
          <div className="text-right">
            <p className="text-xs font-bold leading-tight text-slate-900 sm:text-sm">
              {user?.full_name}
            </p>
            <div className="flex items-center justify-end gap-1 text-[11px]">
              {user?.role === 'admin' ? (
                <span className="inline-flex items-center gap-0.5 font-medium text-indigo-600">
                  <ShieldCheck size={12} />
                  អ្នកគ្រប់គ្រង
                </span>
              ) : (
                <span className="font-medium text-slate-500">គ្រូបង្រៀន</span>
              )}
            </div>
          </div>

          <span className="grid size-9 place-items-center rounded-full bg-gradient-to-tr from-indigo-600 to-blue-600 text-xs font-bold text-white shadow-xs shadow-indigo-600/30 ring-2 ring-white">
            {initials}
          </span>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={signOut}
          title="ចាកចេញពីប្រព័ន្ធ"
          aria-label="ចាកចេញ"
          className="group grid size-9 place-items-center rounded-xl border border-slate-200/80 bg-white text-slate-500 shadow-2xs transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:scale-95"
        >
          <LogOut size={16} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </header>
  )
}
