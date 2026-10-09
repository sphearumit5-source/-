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
        <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md shadow-blue-600/25 transition-transform duration-300 hover:rotate-6 hover:scale-105"><GraduationCap size={21} /></span>
        <div><p className="text-sm font-bold text-slate-900">ប្រព័ន្ធសិស្ស</p><p className="text-xs text-slate-500">វត្តមានតាមមុខ</p></div>
      </div>
      <nav aria-label="ម៉ឺនុយចម្បង" className="stagger flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {items.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={closeMenu}
            className={({ isActive }) => `group relative flex min-h-11 items-center gap-3 overflow-hidden rounded-lg px-3 text-sm font-medium transition-all duration-200 hover:translate-x-1 ${isActive ? 'bg-blue-50 text-blue-900 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            {({ isActive }) => (
              <>
                <span className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-600 transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                <Icon size={18} aria-hidden="true" className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-blue-700' : ''}`} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">ឆ្នាំសិក្សា ២០២៦–២០២៧</div>
    </aside>
  )
}
