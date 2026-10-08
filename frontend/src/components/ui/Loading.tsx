export function Loading({ label = 'កំពុងដំណើរការ…' }: { label?: string }) {
  return <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-slate-600" role="status"><span className="size-5 animate-spin rounded-full border-2 border-blue-700/20 border-t-blue-700" />{label}</div>
}

export function ErrorMessage({ children }: { children: string }) {
  return <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{children}</p>
}

export function StatusBadge({ status, label }: { status: 'present' | 'absent' | 'late' | 'active' | 'inactive'; label: string }) {
  const styles = {
    present: 'bg-emerald-50 text-emerald-800',
    active: 'bg-emerald-50 text-emerald-800',
    absent: 'bg-rose-50 text-rose-800',
    inactive: 'bg-slate-100 text-slate-600',
    late: 'bg-amber-50 text-amber-800',
  }
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>{label}</span>
}