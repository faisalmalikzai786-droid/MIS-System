import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/50 animate-modal-backdrop"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'relative flex max-h-[min(90vh,720px)] w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-modal-panel',
          wide ? 'max-w-2xl' : 'max-w-lg'
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <footer className="shrink-0 border-t border-border bg-muted/20 px-6 py-4">{footer}</footer>
        ) : null}
      </div>
    </div>
  )
}

/** @deprecated Use Modal instead */
export const SlidePanel = Modal
