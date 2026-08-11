import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export function DataTable({
  children,
  className,
  minWidth = '720px',
}: {
  children: ReactNode
  className?: string
  minWidth?: string
}) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card shadow-sm', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          {children}
        </table>
      </div>
    </div>
  )
}

export function DataTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-border bg-muted/40">
      <tr>{children}</tr>
    </thead>
  )
}

export function DataTableHeaderCell({
  children,
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase',
        className
      )}
      {...props}
    >
      {children}
    </th>
  )
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border/70">{children}</tbody>
}

export function DataTableRow({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('transition-colors hover:bg-muted/30', className)} {...props}>
      {children}
    </tr>
  )
}

export function DataTableCell({
  children,
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-3 align-middle', className)} {...props}>
      {children}
    </td>
  )
}

export function DataTableEmpty({
  colSpan,
  message = 'No records found.',
  loading,
}: {
  colSpan: number
  message?: string
  loading?: boolean
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-16 text-center">
        <p className="text-sm font-medium text-foreground">
          {loading ? 'Loading records…' : message}
        </p>
        {!loading ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Try changing filters or create a new record.
          </p>
        ) : null}
      </td>
    </tr>
  )
}

export function DataTableFooter({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between border-t border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground',
        className
      )}
    >
      {children}
    </div>
  )
}
