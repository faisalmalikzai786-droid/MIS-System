import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export type StatCardItem = {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
}

export function StatCards({
  items,
  className,
}: {
  items: StatCardItem[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid gap-4',
        items.length <= 2 && 'sm:grid-cols-2',
        items.length === 3 && 'sm:grid-cols-3',
        items.length >= 4 && 'sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {items.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                  {stat.value}
                </p>
                {stat.hint ? (
                  <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
                ) : null}
              </div>
              {Icon ? (
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
