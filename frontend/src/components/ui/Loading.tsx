export function Loading({ label = 'កំពុងដំណើរការ…' }: { label?: string }) {
  return (
    <div className="flex min-h-40 animate-fade-in flex-col items-center justify-center gap-4 text-sm text-slate-600" role="status">
      <span className="relative grid size-10 place-items-center">
        <span className="absolute inset-0 animate-spin-slow rounded-full border-2 border-blue-700/15 border-t-blue-700" />
        <span className="size-2 animate-pulse rounded-full bg-blue-600" />
      </span>
      {label}
    </div>
  )
}

export function ErrorMessage({ children }: { children: string }) {
  return <p role="alert" className="animate-fade-up rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 shadow-sm">{children}</p>
}

export function StatusBadge({ status, label }: { status: 'present' | 'absent' | 'late' | 'active' | 'inactive'; label: string }) {
  const styles = {
    present: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
    active: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
    absent: 'bg-rose-50 text-rose-800 ring-rose-600/20',
    inactive: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    late: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  }
  const dot = {
    present: 'bg-emerald-600',
    active: 'bg-emerald-600',
    absent: 'bg-rose-600',
    inactive: 'bg-slate-400',
    late: 'bg-amber-500',
  }
  return (
    <span className={`inline-flex animate-pop items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status]}`}>
      <span className={`size-1.5 rounded-full ${dot[status]}`} />
      {label}
    </span>
  )
}
