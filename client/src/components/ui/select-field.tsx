import type { SelectHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export function SelectField({
  className,
  hasError,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }) {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-md border bg-background px-3 text-sm shadow-sm outline-none transition focus-visible:ring-2',
        hasError
          ? 'border-destructive ring-1 ring-destructive/30 focus-visible:ring-destructive/50'
          : 'border-input focus-visible:ring-ring',
        className
      )}
      {...props}
    />
  )
}
