import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useOutletContext } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'

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
import { PageHeader } from '@/components/layout/PageHeader'
import { Modal } from '@/components/layout/Modal'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import {
  apiGet,
  apiSend,
  type AssignableTeacher,
  type CourseClass,
  type User,
} from '@/lib/api'
import { canManageClasses, canViewClasses } from '@/lib/permissions'

const emptyForm = { name: '', description: '', teacher_id: '' }

export default function ClassesPage() {
  const { user } = useOutletContext<{ user: User }>()
  const canView = canViewClasses(user.role)
  const canManage = canManageClasses(user.role)
  const isTeacher = user.role === 'teachers'

  const [items, setItems] = useState<CourseClass[]>([])
  const [teachers, setTeachers] = useState<AssignableTeacher[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const classPromise = apiGet<CourseClass[]>('/api/classes')
      const teacherPromise = canManage
        ? apiGet<AssignableTeacher[]>('/api/classes/assignable-teachers')
        : Promise.resolve([])
      const [classes, teacherRows] = await Promise.all([classPromise, teacherPromise])
      setItems(classes)
      setTeachers(teacherRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load classes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canView) void load()
  }, [canView])

  if (!canView) return <Navigate to="/dashboard" replace />

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setPanelOpen(true)
  }

  function startEdit(item: CourseClass) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      description: item.description || '',
      teacher_id: item.teacher_id ? String(item.teacher_id) : '',
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
    if (!canManage) return
    setSaving(true)
    setError('')
    const payload = {
      name: form.name,
      description: form.description,
      teacher_id: form.teacher_id ? Number(form.teacher_id) : null,
    }
    try {
      if (editingId) {
        const updated = await apiSend<CourseClass>(`/api/classes/${editingId}`, 'PUT', payload)
        setItems((prev) => prev.map((row) => (row.id === editingId ? updated : row)))
      } else {
        const created = await apiSend<CourseClass>('/api/classes', 'POST', payload)
        setItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      }
      closePanel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(id: number) {
    if (!canManage) return
    if (!confirm('Delete this class? Students will keep their record but lose the class link.')) return
    try {
      await apiSend(`/api/classes/${id}`, 'DELETE')
      setItems((prev) => prev.filter((row) => row.id !== id))
      if (editingId === id) closePanel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const colSpan = canManage ? 5 : 4

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        description={
          isTeacher
            ? 'Your assigned training class and enrolled students.'
            : 'Manage training courses and assign teachers to each class.'
        }
        actions={
          canManage ? (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="size-4" />
              Create class
            </Button>
          ) : undefined
        }
      />

      {error && !panelOpen ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <DataTable minWidth="680px">
        <DataTableHead>
          <DataTableHeaderCell>Class name</DataTableHeaderCell>
          <DataTableHeaderCell>Description</DataTableHeaderCell>
          <DataTableHeaderCell>Teacher</DataTableHeaderCell>
          <DataTableHeaderCell>Students</DataTableHeaderCell>
          {canManage ? <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell> : null}
        </DataTableHead>
        <DataTableBody>
          {items.map((item) => (
            <DataTableRow key={item.id}>
              <DataTableCell className="font-medium">{item.name}</DataTableCell>
              <DataTableCell className="max-w-xs truncate text-muted-foreground">
                {item.description || '—'}
              </DataTableCell>
              <DataTableCell className="text-muted-foreground">
                {item.teacher_name || 'Unassigned'}
              </DataTableCell>
              <DataTableCell>
                <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {Number(item.student_count || 0)} enrolled
                </span>
              </DataTableCell>
              {canManage ? (
                <DataTableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(item)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => void onDelete(item.id)}>
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </DataTableCell>
              ) : null}
            </DataTableRow>
          ))}
          {!loading && items.length === 0 ? (
            <DataTableEmpty
              colSpan={colSpan}
              message={
                isTeacher
                  ? 'No class assigned to you yet.'
                  : 'No classes yet. Create your first class.'
              }
            />
          ) : null}
          {loading ? <DataTableEmpty colSpan={colSpan} loading /> : null}
        </DataTableBody>
      </DataTable>
      <DataTableFooter>
        <span>{loading ? 'Loading…' : `${items.length} class(es)`}</span>
      </DataTableFooter>

      <Modal
        open={panelOpen}
        onClose={closePanel}
        title={editingId ? 'Edit class' : 'Create class'}
        description="Assign a teacher so they only see this class and its students."
        footer={
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={closePanel}>
              Cancel
            </Button>
            <Button type="submit" form="class-form" disabled={saving} className="flex-1">
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create class'}
            </Button>
          </div>
        }
      >
        {error && panelOpen ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <form id="class-form" className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="class-name">Class name</Label>
            <Input
              id="class-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Web Development"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="class-desc">Description</Label>
            <Input
              id="class-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="class-teacher">Teacher</Label>
            <SelectField
              id="class-teacher"
              value={form.teacher_id}
              onChange={(e) => setForm((f) => ({ ...f, teacher_id: e.target.value }))}
            >
              <option value="">No teacher assigned</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </SelectField>
          </div>
        </form>
      </Modal>
    </div>
  )
}
