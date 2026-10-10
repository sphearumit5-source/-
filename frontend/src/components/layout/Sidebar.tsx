import {
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  ScanFace,
  Settings,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

type NavItem = {
  label: string
  path: string
  icon: LucideIcon
  adminOnly?: boolean
  highlight?: boolean
}

type NavGroup = {
  title: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: 'ទិដ្ឋភាពទូទៅ',
    items: [
      { label: 'ផ្ទាំងគ្រប់គ្រង', path: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'ការគ្រប់គ្រងសាលា',
    items: [
      { label: 'គ្រប់គ្រងសិស្ស', path: '/students', icon: UsersRound },
      { label: 'គ្រប់គ្រងថ្នាក់រៀន', path: '/classes', icon: GraduationCap, adminOnly: true },
    ],
  },
  {
    title: 'ប្រព័ន្ធស្គាល់មុខ AI',
    items: [
      { label: 'ស្កេនវត្តមាន (AI)', path: '/face-attendance', icon: ScanFace, highlight: true },
      { label: 'ចុះឈ្មោះមុខសិស្ស', path: '/face-registration', icon: Sparkles, adminOnly: true },
    ],
  },
  {
    title: 'ទិន្នន័យ & របាយការណ៍',
    items: [
      { label: 'កត់ត្រាវត្តមាន', path: '/attendance', icon: ClipboardList },
      { label: 'របាយការណ៍សរុប', path: '/reports', icon: CalendarDays },
    ],
  },
  {
    title: 'ប្រព័ន្ធ',
    items: [
      { label: 'ការកំណត់ទូទៅ', path: '/settings', icon: Settings, adminOnly: true },
    ],
  },
]

export function Sidebar({ closeMenu }: { closeMenu?: () => void }) {
  const { user } = useAuth()

  return (
    <aside className="flex h-full w-68 shrink-0 flex-col border-r border-slate-200/80 bg-white">
      {/* Brand Header */}
      <div className="flex h-18 items-center gap-3 border-b border-slate-100 px-5">
        <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-blue-600 text-white shadow-md shadow-indigo-600/25 ring-2 ring-indigo-500/20">
          <GraduationCap size={22} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-tight text-slate-900">
            ប្រព័ន្ធសាលារៀន
          </p>
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[11px] font-medium text-slate-500">វត្តមានឆ្លាតវៃ AI</p>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav aria-label="ម៉ឺនុយចម្បង" className="flex-1 space-y-6 overflow-y-auto px-3.5 py-5">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.adminOnly || user?.role === 'admin'
          )
          if (visibleItems.length === 0) return null

          return (
            <div key={group.title} className="space-y-1">
              <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400">
                {group.title}
              </p>
              <div className="space-y-1 pt-1">
                {visibleItems.map(({ label, path, icon: Icon, highlight }) => (
                  <NavLink
                    key={path}
                    to={path}
                    onClick={closeMenu}
                    className={({ isActive }) =>
                      `group relative flex min-h-10 items-center gap-3 overflow-hidden rounded-xl px-3 text-[13px] font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-indigo-50/80 font-semibold text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-indigo-600 transition-all duration-300 ${
                            isActive ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'
                          }`}
                        />
                        <Icon
                          size={18}
                          aria-hidden="true"
                          className={`transition-all duration-200 group-hover:scale-110 ${
                            isActive
                              ? 'text-indigo-600'
                              : highlight
                              ? 'text-indigo-500'
                              : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        />
                        <span className="truncate">{label}</span>
                        {highlight && !isActive && (
                          <span className="ml-auto rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                            AI
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer Info */}
      <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3.5">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            ម៉ាស៊ីន AI ដំណើរការ
          </span>
          <span className="font-medium text-slate-400">២០២៦–២០២៧</span>
        </div>
      </div>
    </aside>
  )
}
