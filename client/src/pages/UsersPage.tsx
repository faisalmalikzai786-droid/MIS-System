import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'

import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableFooter,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from '@/components/layout/DataTable'
import { PageHeader, PageToolbar } from '@/components/layout/PageHeader'
import { Modal } from '@/components/layout/Modal'
import { StatusBadge } from '@/components/layout/StatusBadge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import {
  apiGet,
  apiSend,
  type CourseClass,
  type ManagedUser,
  type User,
} from '@/lib/api'
import {
  canManageUsers,
  getRolePermissions,
  PERMISSION_LABELS,
  ROLE_META,
  ROLE_OPTIONS,
  ROLE_PERMISSIONS,
} from '@/lib/permissions'

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'reception' as ManagedUser['role'],
  class_id: '',
}

function needsClass(role: ManagedUser['role']) {
  return role === 'teachers' || role === 'students'
}

export default function UsersPage() {
  const { user } = useOutletContext<{ user: User }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const roleFilter = searchParams.get('role') || ''

  const [items, setItems] = useState<ManagedUser[]>([])
  const [classes, setClasses] = useState<CourseClass[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const panelTitle = useMemo(
    () => (editingId ? 'Edit user' : 'Create user'),
    [editingId]
  )

  const filteredItems = useMemo(
    () => (roleFilter ? items.filter((u) => u.role === roleFilter) : items),
    [items, roleFilter]
  )

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of items) {
      counts[item.role] = (counts[item.role] || 0) + 1
    }
    return counts
  }, [items])

  const selectedRolePermissions = getRolePermissions(form.role)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [users, classRows] = await Promise.all([
        apiGet<ManagedUser[]>('/api/users'),
        apiGet<CourseClass[]>('/api/classes'),
      ])
      setItems(users)
      setClasses(classRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canManageUsers(user.role)) void load()
  }, [user.role])

  if (!canManageUsers(user.role, user.permissions as never)) {
    return <Navigate to="/dashboard" replace />
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setPanelOpen(true)
  }

  function startEdit(item: ManagedUser) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      email: item.email,
      password: '',
      role: item.role,
      class_id: item.class_id ? String(item.class_id) : '',
    })
    setError('')
    setPanelOpen(true)
  }

  function closePanel() {
    setPanelOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    setError('')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (needsClass(form.role) && !form.class_id) {
      setError(
        form.role === 'teachers'
          ? 'Please assign a class for this teacher.'
          : 'Please assign a class for this student.'
      )
      setSaving(false)
      return
    }

    const payload = {
      name: form.name,
      email: form.email,
      role: form.role,
      password: form.password || undefined,
      class_id: needsClass(form.role) ? Number(form.class_id) : null,
    }

    try {
      if (editingId) {
        const updated = await apiSend<ManagedUser>(`/api/users/${editingId}`, 'PUT', payload)
        setItems((prev) => prev.map((u) => (u.id === editingId ? updated : u)))
      } else {
        if (!form.password) {
          setError('Password is required for new users.')
          setSaving(false)
          return
        }
        const created = await apiSend<ManagedUser>('/api/users', 'POST', {
          ...payload,
          password: form.password,
        })
        setItems((prev) => [created, ...prev])
      }
      closePanel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(id: number) {
    if (!confirm('Delete this user account?')) return
    try {
      await apiSend(`/api/users/${id}`, 'DELETE')
      setItems((prev) => prev.filter((u) => u.id !== id))
      if (editingId === id) closePanel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Create login accounts, assign roles, and control who can access each module."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild className="gap-2">
              <Link to="/roles">
                <ShieldCheck className="size-4" />
                Roles & permissions
              </Link>
            </Button>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="size-4" />
              Create user
            </Button>
          </div>
        }
      />

      {error && !panelOpen ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {ROLE_OPTIONS.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => {
              if (roleFilter === role) setSearchParams({})
              else setSearchParams({ role })
            }}
            className={`rounded-xl border p-4 text-left shadow-sm transition hover:shadow-md ${
              roleFilter === role ? 'border-primary ring-2 ring-primary/20' : 'border-border bg-card'
            }`}
          >
            <p className="text-sm font-semibold text-foreground">{ROLE_META[role].label}</p>
            <p className="mt-2 text-2xl font-semibold">{roleCounts[role] || 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">users assigned</p>
          </button>
        ))}
      </div>

      <PageToolbar>
        <div className="flex w-full flex-wrap items-center gap-3">
          <SelectField
            value={roleFilter}
            onChange={(e) => {
              const value = e.target.value
              if (value) setSearchParams({ role: value })
              else setSearchParams({})
            }}
            className="w-48"
          >
            <option value="">All roles</option>
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {ROLE_META[role].label}
              </option>
            ))}
          </SelectField>
          {roleFilter ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setSearchParams({})}>
              Clear filter
            </Button>
          ) : null}
        </div>
      </PageToolbar>

      <DataTable minWidth="720px">
        <DataTableHead>
          <DataTableHeaderCell>Name</DataTableHeaderCell>
          <DataTableHeaderCell>Email</DataTableHeaderCell>
          <DataTableHeaderCell>Role</DataTableHeaderCell>
          <DataTableHeaderCell>Class</DataTableHeaderCell>
          <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
        </DataTableHead>
        <DataTableBody>
          {filteredItems.map((item) => (
            <DataTableRow key={item.id}>
              <DataTableCell className="font-medium">
                {item.name}
                {item.id === user.id ? (
                  <span className="ml-2 text-xs text-primary">(you)</span>
                ) : null}
              </DataTableCell>
              <DataTableCell className="text-muted-foreground">{item.email}</DataTableCell>
              <DataTableCell>
                <StatusBadge status={item.role === 'admin' ? 'admin' : item.role} />
              </DataTableCell>
              <DataTableCell className="text-muted-foreground">{item.class_name || '—'}</DataTableCell>
              <DataTableCell className="text-right">
                <div className="inline-flex gap-1">
                  <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(item)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={item.id === user.id}
                    onClick={() => void onDelete(item.id)}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </DataTableCell>
            </DataTableRow>
          ))}
          {!loading && filteredItems.length === 0 ? (
            <DataTableEmpty colSpan={5} message="No users found for this filter." />
          ) : null}
          {loading ? <DataTableEmpty colSpan={5} loading /> : null}
        </DataTableBody>
      </DataTable>
      <DataTableFooter>
        <span>
          {loading
            ? 'Loading…'
            : `${filteredItems.length} user(s)${roleFilter ? ` · ${ROLE_META[roleFilter as ManagedUser['role']].label}` : ''}`}
        </span>
      </DataTableFooter>

      <Modal
        open={panelOpen}
        onClose={closePanel}
        title={panelTitle}
        description={
          editingId
            ? 'Update details, role, class, or reset password.'
            : 'Create a login for a staff member or student.'
        }
        footer={
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={closePanel}>
              Cancel
            </Button>
            <Button type="submit" form="user-form" disabled={saving} className="flex-1">
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create user'}
            </Button>
          </div>
        }
      >
        {error && panelOpen ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <form id="user-form" className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="user-name">Full name</Label>
            <Input
              id="user-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-password">
              {editingId ? 'New password (optional)' : 'Password'}
            </Label>
            <Input
              id="user-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required={!editingId}
              minLength={editingId && !form.password ? undefined : 6}
              placeholder={editingId ? 'Leave blank to keep current' : 'Min 6 characters'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-role">Role</Label>
            <SelectField
              id="user-role"
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  role: e.target.value as ManagedUser['role'],
                  class_id: needsClass(e.target.value as ManagedUser['role']) ? f.class_id : '',
                }))
              }
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {ROLE_PERMISSIONS[role].label}
                </option>
              ))}
            </SelectField>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Permissions for {ROLE_META[form.role].label}
              </p>
              <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                {selectedRolePermissions.map((perm) => (
                  <li key={perm}>• {PERMISSION_LABELS[perm].label}</li>
                ))}
              </ul>
            </div>
          </div>
          {needsClass(form.role) ? (
            <div className="space-y-2">
              <Label htmlFor="user-class">
                {form.role === 'teachers' ? 'Assigned class' : 'Student class'}
              </Label>
              <SelectField
                id="user-class"
                value={form.class_id}
                onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}
                required
              >
                <option value="">Select a class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </SelectField>
            </div>
          ) : null}
        </form>
      </Modal>
    </div>
  )
}
