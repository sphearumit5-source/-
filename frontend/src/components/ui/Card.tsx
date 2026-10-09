import type { HTMLAttributes, ReactNode } from 'react'

export function Card({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-300 ${className}`} {...props}>{children}</section>
}

export function PageHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="animate-fade-down">
        <div className="flex items-center gap-3">
          <span className="h-7 w-1.5 rounded-full bg-gradient-to-b from-blue-500 to-blue-700" aria-hidden="true" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        </div>
        {description && <p className="mt-1.5 pl-[18px] text-sm text-slate-600">{description}</p>}
      </div>
      {action && <div className="animate-fade-up">{action}</div>}
    </div>
  )
}
