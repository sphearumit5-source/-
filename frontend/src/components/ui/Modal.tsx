import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  maxWidth = 'max-w-xl',
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 grid animate-fade-in place-items-center bg-slate-950/60 p-4 backdrop-blur-md"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`w-full ${maxWidth} animate-pop overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl`}
      >
        <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4.5">
          <h2 id="modal-title" className="text-lg font-bold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="បិទបង្អួច"
            className="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </header>
        <div className="max-h-[75vh] overflow-y-auto p-6">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2.5 border-t border-slate-100 bg-slate-50/40 px-6 py-4">
            {footer}
          </footer>
        )}
      </section>
    </div>
  )
}