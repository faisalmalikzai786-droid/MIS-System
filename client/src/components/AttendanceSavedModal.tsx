import { useEffect } from 'react'
import { CheckCircle2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type AttendanceSavedInfo = {
  className: string
  date: string
  present: number
  absent: number
  total: number
}

type Props = {
  open: boolean
  info: AttendanceSavedInfo | null
  onClose: () => void
}

export function AttendanceSavedModal({ open, info, onClose }: Props) {
  useEffect(() => {
    if (!open) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open || !info) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attendance-saved-title"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] animate-modal-backdrop"
        onClick={onClose}
      />

      <div
        className={cn(
          'relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border/80',
          'bg-card text-card-foreground shadow-2xl shadow-slate-900/15',
          'animate-modal-panel'
        )}
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-accent/40 to-card px-6 pb-5 pt-6">
          <div className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-primary/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 left-8 size-28 rounded-full bg-accent/50 blur-2xl" />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition hover:bg-background/70 hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>

          <div className="relative flex flex-col items-center text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 animate-modal-pop">
              <CheckCircle2 className="size-8" strokeWidth={2.25} />
            </div>
            <h2 id="attendance-saved-title" className="text-xl font-semibold tracking-tight">
              Attendance saved
            </h2>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              Records for <span className="font-medium text-foreground">{info.className}</span> on{' '}
              <span className="font-medium text-foreground">{info.date}</span> were updated
              successfully.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 px-6 py-5">
          <div className="rounded-xl border border-border/70 bg-muted/40 px-3 py-3 text-center">
            <div className="text-2xl font-semibold tabular-nums text-primary">{info.present}</div>
            <div className="mt-0.5 text-xs font-medium text-muted-foreground">Present</div>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/40 px-3 py-3 text-center">
            <div className="text-2xl font-semibold tabular-nums text-foreground">{info.absent}</div>
            <div className="mt-0.5 text-xs font-medium text-muted-foreground">Absent</div>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/40 px-3 py-3 text-center">
            <div className="text-2xl font-semibold tabular-nums text-foreground">{info.total}</div>
            <div className="mt-0.5 text-xs font-medium text-muted-foreground">Total</div>
          </div>
        </div>

        <div className="border-t border-border/70 bg-muted/20 px-6 py-4">
          <Button type="button" className="w-full" onClick={onClose}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
