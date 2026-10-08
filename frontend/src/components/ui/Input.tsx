import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, id, className = '', ...props }, ref) {
  const inputId = id ?? props.name
  return (
    <label className="block space-y-1.5 text-sm font-medium text-slate-700" htmlFor={inputId}>
      <span>{label}</span>
      <input
        ref={ref}
        id={inputId}
        className={`min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15 ${error ? 'border-rose-500' : 'border-slate-300'} ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <span className="block text-xs font-normal text-rose-700">{error}</span>}
    </label>
  )
})