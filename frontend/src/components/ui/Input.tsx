import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, icon, id, className = '', ...props },
  ref
) {
  const inputId = id ?? props.name
  return (
    <label className="block space-y-1.5 text-sm font-medium text-slate-700" htmlFor={inputId}>
      <span className="flex items-center justify-between">
        <span>
          {label}
          {props.required && <span className="ml-1 text-rose-500">*</span>}
        </span>
      </span>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`h-11 w-full rounded-xl border bg-white px-3.5 py-2 text-slate-900 transition-all duration-200 placeholder:text-slate-400 focus:outline-none ${
            icon ? 'pl-10' : ''
          } ${
            error
              ? 'border-rose-400 bg-rose-50/20 focus:border-rose-600 focus:ring-4 focus:ring-rose-500/10'
              : 'border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10'
          } ${className}`}
          aria-invalid={Boolean(error)}
          {...props}
        />
      </div>
      {error && (
        <span className="block animate-fade-down text-xs font-normal text-rose-600">
          {error}
        </span>
      )}
    </label>
  )
})