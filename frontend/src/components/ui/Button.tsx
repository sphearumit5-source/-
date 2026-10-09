import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  icon?: ReactNode
}

const variants = {
  primary: 'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-md shadow-blue-700/25 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:shadow-blue-700/30 focus-visible:ring-blue-700',
  secondary: 'border border-slate-300 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow focus-visible:ring-blue-700',
  danger: 'bg-gradient-to-b from-rose-600 to-rose-700 text-white shadow-md shadow-rose-700/25 hover:from-rose-700 hover:to-rose-800 hover:shadow-lg hover:shadow-rose-700/30 focus-visible:ring-rose-700',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-blue-700',
}

export function Button({ variant = 'primary', icon, className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
