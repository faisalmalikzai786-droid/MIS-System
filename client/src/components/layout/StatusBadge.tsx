import { cn } from '@/lib/utils'

const variants: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  partial: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  unpaid: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  admin: 'bg-primary/10 text-primary ring-primary/20',
  default: 'bg-secondary text-secondary-foreground ring-border',
}

export function StatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const key = status.toLowerCase()
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset',
        variants[key] || variants.default,
        className
      )}
    >
      {status}
    </span>
  )
}
