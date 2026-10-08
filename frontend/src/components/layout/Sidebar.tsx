import { GraduationCap } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { NAV_ITEMS } from '../../utils/constants'

export function Sidebar({ closeMenu }: { closeMenu?: () => void }) {
  const { user } = useAuth()
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'admin')
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-[72px] items-center gap-3 border-b border-slate-200 px-5">
        <span className="grid size-10 place-items-center rounded-lg bg-blue-700 text-white"><GraduationCap size={21} /></span>
        <div><p className="text-sm font-bold text-slate-900">ប្រព័ន្ធសិស្ស</p><p className="text-xs text-slate-500">វត្តមានតាមមុខ</p></div>
      </div>
      <nav aria-label="ម៉ឺនុយចម្បង" className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {items.map(({ label, path, icon: Icon }) => (
          <NavLink key={path} to={path} onClick={closeMenu} className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${isActive ? 'bg-blue-50 text-blue-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
            <Icon size={18} aria-hidden="true" /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">ឆ្នាំសិក្សា ២០២៦–២០២៧</div>
    </aside>
  )
}