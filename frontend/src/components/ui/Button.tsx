import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
}

const variants = {
  primary:
    'bg-gradient-to-r from-indigo-600 via-indigo-600 to-blue-600 text-white shadow-sm shadow-indigo-500/25 hover:from-indigo-500 hover:to-blue-500 hover:shadow-md hover:shadow-indigo-500/35 focus-visible:ring-indigo-500',
  secondary:
    'border border-slate-200/90 bg-white text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50/90 hover:text-slate-900 focus-visible:ring-indigo-500',
  success:
    'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-500 hover:shadow-md hover:shadow-emerald-500/35 focus-visible:ring-emerald-500',
  danger:
    'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-sm shadow-rose-500/25 hover:from-rose-500 hover:to-red-500 hover:shadow-md hover:shadow-rose-500/35 focus-visible:ring-rose-500',
  ghost:
    'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 focus-visible:ring-indigo-500',
}

const sizes = {
  sm: 'h-9 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 py-2 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-base gap-2.5 rounded-xl font-bold',
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  )
}
