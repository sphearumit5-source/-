import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'

export function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <div className="hidden lg:block"><Sidebar /></div>
      {menuOpen && <div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setMenuOpen(false)}><div className="h-full w-64" onClick={(event) => event.stopPropagation()}><Sidebar closeMenu={() => setMenuOpen(false)} /></div></div>}
      <div className="min-w-0 flex-1">
        <Navbar onMenuClick={() => setMenuOpen(true)} />
        <main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  )
}