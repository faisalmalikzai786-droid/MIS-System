import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useOutletContext } from 'react-router-dom'
import { Check, Shield, Users, X } from 'lucide-react'

import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from '@/components/layout/DataTable'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCards } from '@/components/layout/StatCards'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { apiGet, type PermissionMatrix, type Role, type RoleDefinition, type User } from '@/lib/api'
import { canViewRoles, ROLE_META, ROLE_OPTIONS } from '@/lib/permissions'
import { cn } from '@/lib/utils'

const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-primary/10 text-primary border-primary/20',
  finance: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  teachers: 'bg-blue-50 text-blue-700 border-blue-200',
  reception: 'bg-amber-50 text-amber-800 border-amber-200',
  students: 'bg-slate-100 text-slate-700 border-slate-200',
}

export default function RolesPage() {
  const { user } = useOutletContext<{ user: User }>()
  const [roles, setRoles] = useState<RoleDefinition[]>([])
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const canView = canViewRoles(user.role, user.permissions as never)

  useEffect(() => {
    if (!canView) return
    void (async () => {
      setLoading(true)
      setError('')
      try {
        const [roleRows, matrixData] = await Promise.all([
          apiGet<RoleDefinition[]>('/api/roles'),
          apiGet<PermissionMatrix>('/api/roles/matrix'),
        ])
        setRoles(roleRows)
        setMatrix(matrixData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load roles')
      } finally {
        setLoading(false)
      }
    })()
  }, [canView])

  const totalUsers = useMemo(
    () => roles.reduce((sum, r) => sum + r.user_count, 0),
    [roles]
  )

  if (!canView) return <Navigate to="/dashboard" replace />

  const activeRole = selectedRole ? roles.find((r) => r.id === selectedRole) : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & permissions"
        description="View system roles, what each role can do, and how many users are assigned."
        actions={
          <Button asChild variant="outline" className="gap-2">
            <Link to="/users">
              <Users className="size-4" />
              Manage users
            </Link>
          </Button>
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <StatCards
        items={[
          { label: 'System roles', value: roles.length, icon: Shield },
          { label: 'Total users', value: totalUsers, icon: Users },
          {
            label: 'Permissions',
            value: matrix?.matrix.reduce((n, g) => n + g.permissions.length, 0) ?? 0,
          },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {ROLE_OPTIONS.map((roleId) => {
          const meta = ROLE_META[roleId]
          const roleData = roles.find((r) => r.id === roleId)
          const count = roleData?.user_count ?? 0
          const isSelected = selectedRole === roleId

          return (
            <button
              key={roleId}
              type="button"
              onClick={() => setSelectedRole(isSelected ? null : roleId)}
              className={cn(
                'rounded-xl border p-4 text-left shadow-sm transition hover:shadow-md',
                ROLE_COLORS[roleId],
                isSelected && 'ring-2 ring-primary ring-offset-2'
              )}
            >
              <p className="font-semibold">{meta.label}</p>
              <p className="mt-1 text-xs opacity-80 line-clamp-2">{meta.description}</p>
              <p className="mt-3 text-sm font-medium">
                {loading ? '…' : `${count} user${count === 1 ? '' : 's'}`}
              </p>
              <p className="mt-1 text-xs opacity-70">
                {meta.permissions.length} permission{meta.permissions.length === 1 ? '' : 's'}
              </p>
            </button>
          )
        })}
      </div>

      {activeRole ? (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{activeRole.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{activeRole.description}</p>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link to={`/users?role=${activeRole.id}`}>View {activeRole.user_count} users</Link>
            </Button>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {activeRole.permissions.map((perm) => (
              <li
                key={perm}
                className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm"
              >
                <Check className="size-4 shrink-0 text-primary" />
                {matrix?.permissions[perm]?.label || perm}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Permission matrix
        </h2>
        <p className="text-sm text-muted-foreground">
          Rows are permissions; columns are roles. A check means that role has the permission.
        </p>

        <DataTable minWidth="900px">
          <DataTableHead>
            <DataTableHeaderCell>Permission</DataTableHeaderCell>
            {ROLE_OPTIONS.map((role) => (
              <DataTableHeaderCell key={role} className="text-center">
                {ROLE_META[role].label}
              </DataTableHeaderCell>
            ))}
          </DataTableHead>
          <DataTableBody>
            {matrix?.matrix.flatMap((group) =>
              group.permissions.map((perm) => (
                <DataTableRow key={perm.key}>
                  <DataTableCell>
                    <div className="font-medium">{perm.label}</div>
                    <div className="text-xs text-muted-foreground">{group.group}</div>
                  </DataTableCell>
                  {ROLE_OPTIONS.map((role) => (
                    <DataTableCell key={role} className="text-center">
                      {perm.roles[role] ? (
                        <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Check className="size-4" />
                        </span>
                      ) : (
                        <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <X className="size-3.5" />
                        </span>
                      )}
                    </DataTableCell>
                  ))}
                </DataTableRow>
              ))
            )}
            {!loading && !matrix ? (
              <DataTableRow>
                <DataTableCell colSpan={ROLE_OPTIONS.length + 1} className="py-12 text-center">
                  No permission data loaded.
                </DataTableCell>
              </DataTableRow>
            ) : null}
          </DataTableBody>
        </DataTable>
      </div>
    </div>
  )
}
