import { AlertCircle, CheckCircle2 } from 'lucide-react'

export function Loading({ label = 'កំពុងដំណើរការ…' }: { label?: string }) {
  return (
    <div
      className="flex min-h-48 animate-fade-in flex-col items-center justify-center gap-3.5 text-sm font-medium text-slate-500"
      role="status"
    >
      <div className="relative grid size-10 place-items-center">
        <span className="absolute inset-0 animate-spin-slow rounded-full border-2 border-indigo-500/20 border-t-indigo-600" />
        <span className="size-2 rounded-full bg-indigo-600 shadow-xs shadow-indigo-600/50" />
      </div>
      <p className="animate-pulse text-xs text-slate-500">{label}</p>
    </div>
  )
}

export function ErrorMessage({ children }: { children: string }) {
  return (
    <div
      role="alert"
      className="animate-fade-up flex items-center gap-3 rounded-xl border border-rose-200/90 bg-rose-50/70 px-4 py-3 text-sm font-medium text-rose-800 shadow-xs"
    >
      <AlertCircle size={18} className="shrink-0 text-rose-600" />
      <span className="leading-snug">{children}</span>
    </div>
  )
}

export function SuccessMessage({ children }: { children: string }) {
  return (
    <div
      role="status"
      className="animate-fade-up flex items-center gap-3 rounded-xl border border-emerald-200/90 bg-emerald-50/70 px-4 py-3 text-sm font-medium text-emerald-800 shadow-xs"
    >
      <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
      <span className="leading-snug">{children}</span>
    </div>
  )
}

export function StatusBadge({
  status,
  label,
}: {
  status: 'present' | 'absent' | 'late' | 'active' | 'inactive'
  label: string
}) {
  const styles = {
    present:
      'bg-emerald-50 text-emerald-700 ring-emerald-500/30 border border-emerald-200/60',
    active:
      'bg-emerald-50 text-emerald-700 ring-emerald-500/30 border border-emerald-200/60',
    absent:
      'bg-rose-50 text-rose-700 ring-rose-500/30 border border-rose-200/60',
    inactive:
      'bg-slate-100 text-slate-600 ring-slate-400/20 border border-slate-200/60',
    late:
      'bg-amber-50 text-amber-700 ring-amber-500/30 border border-amber-200/60',
  }

  const dot = {
    present: 'bg-emerald-500 shadow-xs shadow-emerald-500/50',
    active: 'bg-emerald-500 shadow-xs shadow-emerald-500/50',
    absent: 'bg-rose-500 shadow-xs shadow-rose-500/50',
    inactive: 'bg-slate-400',
    late: 'bg-amber-500 shadow-xs shadow-amber-500/50',
  }

  return (
    <span
      className={`inline-flex animate-pop items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-2xs ${styles[status]}`}
    >
      <span className={`size-1.5 rounded-full ${dot[status]}`} />
      <span>{label}</span>
    </span>
  )
}
