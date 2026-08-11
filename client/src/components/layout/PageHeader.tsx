import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type PageHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
  children?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, children, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {(actions || children) && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}{children}</div>
      )}
    </div>
  )
}

export function PageToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center',
        className
      )}
    >
      {children}
    </div>
  )
}
