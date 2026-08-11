import type { ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { DashboardAnalytics } from '@/lib/api'
import { cn } from '@/lib/utils'

const palette = {
  grid: 'oklch(0.94 0.008 240)',
  axis: 'oklch(0.62 0.02 240)',
  billed: 'oklch(0.82 0.06 250)',
  collected: 'oklch(0.48 0.14 250)',
  paid: 'oklch(0.58 0.14 155)',
  partial: 'oklch(0.72 0.14 75)',
  unpaid: 'oklch(0.72 0.02 240)',
  present: 'oklch(0.52 0.14 155)',
  absent: 'oklch(0.62 0.18 25)',
  students: 'oklch(0.52 0.16 265)',
}

const axisTick = { fontSize: 11, fill: palette.axis, fontWeight: 500 }

function formatMoney(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
  return value.toLocaleString()
}

function formatMoneyFull(value: number) {
  return value.toLocaleString()
}

type TooltipEntry = {
  name?: string
  value?: number
  color?: string
}

function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter = (v) => String(v),
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
  valueFormatter?: (value: number) => string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="min-w-[140px] rounded-xl border border-border/80 bg-card/95 px-3.5 py-2.5 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.25)] backdrop-blur-sm">
      {label ? (
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
      ) : null}
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={String(entry.name)} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: entry.color || palette.collected }}
              />
              {entry.name}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {valueFormatter(Number(entry.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </div>
      ))}
    </div>
  )
}

function ChartCard({
  title,
  description,
  accent,
  children,
  footer,
}: {
  title: string
  description?: string
  accent?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.08)]">
      <div className="border-b border-border/60 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span
            className={cn('mt-1 size-2 shrink-0 rounded-full', accent || 'bg-primary')}
            aria-hidden
          />
          <div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
            {description ? (
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="bg-[linear-gradient(180deg,oklch(0.995_0.004_250),oklch(0.985_0.006_250))] px-3 py-4 sm:px-5 sm:py-5">
        <div className="h-[280px] w-full">{children}</div>
        {footer}
      </div>
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-white/60 px-6 text-center">
      <div className="mb-3 size-10 rounded-full bg-muted/80" />
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function DonutCenter({ total, label }: { total: number; label: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-3xl font-bold tracking-tight text-foreground">{total}</span>
      <span className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  )
}

const statusColors: Record<string, string> = {
  Paid: palette.paid,
  Partial: palette.partial,
  Unpaid: palette.unpaid,
}

export function DashboardCharts({
  data,
  loading,
}: {
  data: DashboardAnalytics | null
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-[380px] animate-pulse rounded-2xl border border-border/70 bg-linear-to-b from-muted/20 to-muted/40"
          />
        ))}
      </div>
    )
  }

  if (!data) return null

  const hasFeeCharts = Boolean(data.fee_collection?.length)
  const hasAttendance = Boolean(data.attendance_trend?.length)
  const hasStudents = Boolean(data.students_by_class?.length)
  const hasFeeStatus = Boolean(data.fee_status?.length)

  if (!hasFeeCharts && !hasAttendance && !hasStudents) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground shadow-sm">
        No chart data available for your role yet.
      </div>
    )
  }

  const feeStatusTotal = data.fee_status?.reduce((sum, item) => sum + item.value, 0) ?? 0
  const feeStatusData =
    data.fee_status?.map((item) => ({
      ...item,
      color: statusColors[item.name] || item.color,
    })) ?? []

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {hasFeeCharts ? (
        <ChartCard
          title="Fee collection"
          description="Monthly billed vs collected amounts this year"
          accent="bg-[oklch(0.48_0.14_250)]"
          footer={
            <ChartLegend
              items={[
                { label: 'Billed', color: palette.billed },
                { label: 'Collected', color: palette.collected },
              ]}
            />
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.fee_collection}
              margin={{ top: 12, right: 12, left: -8, bottom: 4 }}
              barGap={4}
              barCategoryGap="22%"
            >
              <CartesianGrid stroke={palette.grid} strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="month"
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                dy={8}
              />
              <YAxis
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatMoney}
                width={42}
              />
              <Tooltip
                cursor={{ fill: 'oklch(0.96 0.01 250 / 0.5)', radius: 8 }}
                content={<ChartTooltip valueFormatter={formatMoneyFull} />}
              />
              <Bar
                dataKey="billed"
                name="Billed"
                fill={palette.billed}
                radius={[6, 6, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="collected"
                name="Collected"
                fill={palette.collected}
                radius={[6, 6, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}

      {hasFeeStatus ? (
        <ChartCard
          title="Payment status"
          description="Fee bills by payment status this year"
          accent="bg-[oklch(0.58_0.14_155)]"
          footer={
            <ChartLegend
              items={feeStatusData.map((item) => ({
                label: item.name,
                color: item.color,
              }))}
            />
          }
        >
          <div className="relative h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={feeStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="46%"
                  innerRadius={72}
                  outerRadius={102}
                  paddingAngle={4}
                  stroke="oklch(1 0 0)"
                  strokeWidth={3}
                >
                  {feeStatusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <DonutCenter total={feeStatusTotal} label="Total bills" />
          </div>
        </ChartCard>
      ) : null}

      {hasAttendance ? (
        <ChartCard
          title="Attendance trend"
          description="Present vs absent — last 7 days"
          accent="bg-[oklch(0.52_0.14_155)]"
          footer={
            <ChartLegend
              items={[
                { label: 'Present', color: palette.present },
                { label: 'Absent', color: palette.absent },
              ]}
            />
          }
        >
          {data.attendance_trend!.every((d) => d.present === 0 && d.absent === 0) ? (
            <EmptyChart message="No attendance recorded in the last 7 days." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.attendance_trend}
                margin={{ top: 12, right: 12, left: -8, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="presentFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={palette.present} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={palette.present} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="absentFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={palette.absent} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={palette.absent} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={palette.grid} strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ ...axisTick, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  dy={8}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="present"
                  name="Present"
                  stroke={palette.present}
                  fill="url(#presentFill)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, fill: 'white' }}
                />
                <Area
                  type="monotone"
                  dataKey="absent"
                  name="Absent"
                  stroke={palette.absent}
                  fill="url(#absentFill)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, fill: 'white' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      ) : null}

      {hasStudents ? (
        <ChartCard
          title="Students by class"
          description="Active enrollment per class"
          accent="bg-[oklch(0.52_0.16_265)]"
          footer={<ChartLegend items={[{ label: 'Active students', color: palette.students }]} />}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.students_by_class}
              layout="vertical"
              margin={{ top: 4, right: 20, left: 4, bottom: 4 }}
              barCategoryGap="18%"
            >
              <CartesianGrid stroke={palette.grid} strokeDasharray="4 4" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={axisTick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="class"
                width={108}
                tick={{ ...axisTick, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'oklch(0.96 0.01 250 / 0.45)', radius: 6 }}
                content={<ChartTooltip />}
              />
              <Bar
                dataKey="students"
                name="Students"
                fill={palette.students}
                radius={[0, 8, 8, 0]}
                maxBarSize={22}
                background={{ fill: 'oklch(0.97 0.006 250)', radius: 8 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}
    </div>
  )
}
