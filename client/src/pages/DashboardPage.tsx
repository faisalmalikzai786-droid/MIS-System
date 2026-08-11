import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Shield,
  UserRoundCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { StatCards } from '@/components/layout/StatCards'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'
import {
  apiGet,
  type CourseClass,
  type DashboardAnalytics,
  type FeeSummary,
  type Student,
  type StudentAttendanceSummary,
  type User,
} from '@/lib/api'
import {
  canManageUsers,
  canMarkAttendance,
  canViewClasses,
  canViewFees,
  canViewStudents,
} from '@/lib/permissions'

type ModuleLink = {
  to: string
  title: string
  description: string
  icon: LucideIcon
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function ModuleCard({ item }: { item: ModuleLink }) {
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-foreground">{item.title}</p>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const { user } = useOutletContext<{ user: User }>()
  const [classCount, setClassCount] = useState(0)
  const [studentCount, setStudentCount] = useState(0)
  const [studentsPresent, setStudentsPresent] = useState(0)
  const [unpaidFees, setUnpaidFees] = useState(0)
  const [collected, setCollected] = useState(0)
  const [chartData, setChartData] = useState<DashboardAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartsLoading, setChartsLoading] = useState(true)

  const showClasses = canViewClasses(user.role)
  const showStudents = canViewStudents(user.role)
  const showAttendance = canMarkAttendance(user.role)
  const showFees = canViewFees(user.role)
  const showUsers = canManageUsers(user.role)

  const todayLabel = useMemo(() => formatDateLabel(new Date()), [])

  useEffect(() => {
    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const year = String(d.getFullYear())
    const tasks: Promise<void>[] = []

    if (showClasses) {
      tasks.push(
        apiGet<CourseClass[]>('/api/classes')
          .then((classes) => setClassCount(classes.length))
          .catch(() => setClassCount(0))
      )
    }
    if (showStudents) {
      tasks.push(
        apiGet<Student[]>('/api/students')
          .then((students) => setStudentCount(students.length))
          .catch(() => setStudentCount(0))
      )
    }
    if (showAttendance) {
      tasks.push(
        apiGet<StudentAttendanceSummary>(`/api/student-attendance/summary?date=${today}`)
          .then((att) => setStudentsPresent(att.present_count + att.late_count))
          .catch(() => setStudentsPresent(0))
      )
    }
    if (showFees) {
      tasks.push(
        apiGet<FeeSummary>(`/api/fee-payments/summary?year=${year}`)
          .then((fees) => {
            setUnpaidFees(fees.unpaid_count)
            setCollected(fees.collected_amount)
          })
          .catch(() => {
            setUnpaidFees(0)
            setCollected(0)
          })
      )
    }

    void Promise.all(tasks).finally(() => setLoading(false))

    setChartsLoading(true)
    apiGet<DashboardAnalytics>('/api/dashboard/analytics')
      .then(setChartData)
      .catch(() => setChartData(null))
      .finally(() => setChartsLoading(false))
  }, [showClasses, showStudents, showAttendance, showFees])

  const stats = [
    ...(showClasses
      ? [{ label: 'Classes', value: classCount, hint: 'Active courses', icon: BookOpen }]
      : []),
    ...(showStudents
      ? [{ label: 'Students', value: studentCount, hint: 'Enrolled learners', icon: GraduationCap }]
      : []),
    ...(showAttendance
      ? [{ label: 'Present today', value: studentsPresent, hint: 'Student attendance', icon: UserRoundCheck }]
      : []),
    ...(showFees
      ? [
          {
            label: 'Unpaid fees',
            value: unpaidFees,
            hint: `Collected ${Number(collected).toLocaleString()}`,
            icon: Wallet,
          },
        ]
      : []),
  ]

  const modules: ModuleLink[] = [
    ...(showClasses
      ? [{ to: '/classes', title: 'Classes', description: 'Manage courses and teachers', icon: BookOpen }]
      : []),
    ...(showStudents
      ? [{ to: '/students', title: 'Students', description: 'Enroll and manage student records', icon: GraduationCap }]
      : []),
    ...(showAttendance
      ? [{ to: '/student-attendance', title: 'Attendance', description: 'Mark daily student attendance', icon: UserRoundCheck }]
      : []),
    ...(showFees
      ? [{ to: '/fees', title: 'Fees', description: 'Create bills and track payments', icon: Wallet }]
      : []),
    ...(showUsers
      ? [
          { to: '/roles', title: 'Roles', description: 'View roles and permission matrix', icon: Shield },
          { to: '/users', title: 'Users', description: 'Manage staff accounts and roles', icon: Shield },
        ]
      : []),
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${user.name}`}
        description="Overview of your training center — classes, students, attendance, and fees."
      />

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Today</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{todayLabel}</p>
          </div>
          <div className="rounded-lg bg-primary/10 px-4 py-2 text-sm">
            <span className="text-muted-foreground">Role · </span>
            <span className="font-medium capitalize text-primary">{user.role}</span>
          </div>
        </div>
      </div>

      {stats.length ? (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Overview {loading ? '· Loading…' : ''}
          </h2>
          <StatCards items={stats} />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          Your account has limited access. Contact admin for more permissions.
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Analytics {chartsLoading ? '· Loading…' : ''}
        </h2>
        <DashboardCharts data={chartData} loading={chartsLoading} />
      </div>

      {modules.length ? (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Quick access
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((item) => (
              <ModuleCard key={item.to} item={item} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
