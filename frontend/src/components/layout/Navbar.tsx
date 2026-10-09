import { LogOut, Menu } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, signOut } = useAuth()
  const initials = (user?.full_name ?? '?').trim().charAt(0).toUpperCase()
  return (
    <header className="glass sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200/80 px-4 shadow-[0_1px_0_rgba(15,23,42,0.04)] sm:px-7">
      <button type="button" onClick={onMenuClick} aria-label="បើកម៉ឺនុយ" className="rounded-lg p-2 text-slate-600 transition hover:scale-105 hover:bg-slate-100 active:scale-95 lg:hidden"><Menu size={21} /></button>
      <div className="hidden text-sm font-medium text-slate-500 sm:block">ប្រព័ន្ធគ្រប់គ្រងសិស្ស និងវត្តមាន</div>
      <div className="ml-auto flex items-center gap-3">
        <div className="text-right"><p className="text-sm font-semibold text-slate-800">{user?.full_name}</p><p className="text-xs text-slate-500">{user?.role === 'admin' ? 'អ្នកគ្រប់គ្រង' : 'គ្រូបង្រៀន'}</p></div>
        <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-sm font-bold text-white shadow-sm ring-2 ring-white">{initials}</span>
        <button type="button" onClick={signOut} title="ចាកចេញ" aria-label="ចាកចេញ" className="rounded-lg p-2 text-slate-500 transition hover:scale-105 hover:bg-rose-50 hover:text-rose-700 active:scale-95"><LogOut size={18} /></button>
      </div>
    </header>
  )
}
