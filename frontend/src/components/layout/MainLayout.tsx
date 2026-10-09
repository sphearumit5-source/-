import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'

export function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <div className="sticky top-0 hidden h-screen lg:block"><Sidebar /></div>
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-slate-950/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="animate-drawer relative h-full w-64 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <Sidebar closeMenu={() => setMenuOpen(false)} />
          </div>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <Navbar onMenuClick={() => setMenuOpen(true)} />
        <main key={location.pathname} className="mx-auto max-w-[1500px] animate-fade-up p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
