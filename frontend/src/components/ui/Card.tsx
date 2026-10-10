import type { HTMLAttributes, ReactNode } from 'react'

export function Card({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03),0_8px_24px_rgba(15,23,42,0.03)] transition-all duration-300 ${className}`}
      {...props}
    >
      {children}
    </section>
  )
}

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="animate-fade-down">
        <div className="flex items-center gap-3">
          <span
            className="h-7 w-1.5 rounded-full bg-gradient-to-b from-indigo-500 via-indigo-600 to-blue-600 shadow-xs shadow-indigo-500/40"
            aria-hidden="true"
          />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
        </div>
        {description && (
          <p className="mt-1.5 pl-[18px] text-sm font-normal text-slate-500">
            {description}
          </p>
        )}
      </div>
      {action && <div className="animate-fade-up flex items-center gap-2">{action}</div>}
    </div>
  )
}
