import { LogOut, Menu } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, signOut } = useAuth()
  return (
    <header className="flex h-[72px] items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-7">
      <button type="button" onClick={onMenuClick} aria-label="បើកម៉ឺនុយ" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu size={21} /></button>
      <div className="hidden text-sm text-slate-500 sm:block">ប្រព័ន្ធគ្រប់គ្រងសិស្ស និងវត្តមាន</div>
      <div className="ml-auto flex items-center gap-3">
        <div className="text-right"><p className="text-sm font-semibold text-slate-800">{user?.full_name}</p><p className="text-xs text-slate-500">{user?.role === 'admin' ? 'អ្នកគ្រប់គ្រង' : 'គ្រូបង្រៀន'}</p></div>
        <button type="button" onClick={signOut} title="ចាកចេញ" aria-label="ចាកចេញ" className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><LogOut size={18} /></button>
      </div>
    </header>
  )
}