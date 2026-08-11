import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Building2,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  ShieldCheck,
  UserRoundCheck,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { apiGet, type User } from '@/lib/api'
import {
  canManageUsers,
  canViewRoles,
  canMarkAttendance,
  canViewClasses,
  canViewFees,
  canViewStudents,
} from '@/lib/permissions'
import { cn } from '@/lib/utils'

type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  show: (user: User) => boolean
  group: string
}

const allNav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: () => true, group: 'Overview' },
  {
    to: '/classes',
    label: 'Classes',
    icon: BookOpen,
    show: (u) => canViewClasses(u.role, u.permissions as never),
    group: 'Academic',
  },
  {
    to: '/students',
    label: 'Students',
    icon: GraduationCap,
    show: (u) => canViewStudents(u.role, u.permissions as never),
    group: 'Academic',
  },
  {
    to: '/student-attendance',
    label: 'Attendance',
    icon: UserRoundCheck,
    show: (u) => canMarkAttendance(u.role, u.permissions as never),
    group: 'Academic',
  },
  {
    to: '/fees',
    label: 'Fees',
    icon: Wallet,
    show: (u) => canViewFees(u.role, u.permissions as never),
    group: 'Finance',
  },
  {
    to: '/roles',
    label: 'Roles',
    icon: ShieldCheck,
    show: (u) => canViewRoles(u.role, u.permissions as never),
    group: 'Administration',
  },
  {
    to: '/users',
    label: 'Users',
    icon: Shield,
    show: (u) => canManageUsers(u.role, u.permissions as never),
    group: 'Administration',
  },
]

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/classes': 'Classes',
  '/students': 'Students',
  '/student-attendance': 'Attendance',
  '/fees': 'Fees',
  '/users': 'Users',
  '/roles': 'Roles',
  '/change-password': 'Change Password',
}

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    apiGet<User>('/auth/me')
      .then((data) => {
        if (!data?.id) {
          navigate('/login', { replace: true })
          return
        }
        setUser(data)
      })
      .catch(() => navigate('/login', { replace: true }))
  }, [navigate])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  async function logout() {
    await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    navigate('/login', { replace: true })
  }

  if (!user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-pulse rounded-full bg-primary/20" />
          <p className="text-sm">Loading workspace…</p>
        </div>
      </div>
    )
  }

  const nav = allNav.filter((item) => item.show(user))
  const groups = [...new Set(nav.map((item) => item.group))]
  const pageTitle = pageTitles[location.pathname] || 'MIS'

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Building2 className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-sidebar-foreground">Course MIS</p>
          <p className="text-xs text-sidebar-muted">Management System</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group}>
            <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-sidebar-muted uppercase">
              {group}
            </p>
            <div className="space-y-0.5">
              {nav
                .filter((item) => item.group === group)
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                          : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                      )
                    }
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-lg bg-sidebar-accent/50 px-3 py-3">
          <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
          <p className="truncate text-xs capitalize text-sidebar-muted">{user.role}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-svh bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-72 max-w-[85vw] border-r border-sidebar-border bg-sidebar shadow-xl">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4"
              onClick={() => setMobileOpen(false)}
            >
              <X className="size-4" />
            </Button>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-4" />
            </Button>
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {pageTitle}
              </p>
              <p className="text-sm font-semibold text-foreground">Training Center</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => navigate('/change-password')}
            >
              <KeyRound className="size-3.5" />
              <span className="hidden sm:inline">Password</span>
            </Button>
            <Button variant="outline" size="sm" onClick={logout} className="gap-1.5">
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  )
}
