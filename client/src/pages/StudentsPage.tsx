import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate, useOutletContext } from 'react-router-dom'
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react'

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
  type Student,
  type User,
} from '@/lib/api'
import { canManageStudents, canViewStudents } from '@/lib/permissions'

type StudentForm = {
  student_code: string
  full_name: string
  father_name: string
  email: string
  phone: string
  class_id: string
  enroll_date: string
  status: 'active' | 'inactive'
}

type FieldErrors = Partial<Record<keyof StudentForm, string>>

const emptyForm: StudentForm = {
  student_code: '',
  full_name: '',
  father_name: '',
  email: '',
  phone: '',
  class_id: '',
  enroll_date: '',
  status: 'active',
}

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s'.-]{1,79}$/u
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
const PHONE_RE = /^\+?[0-9][0-9\s()-]{6,18}$/

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function validateStudentForm(form: StudentForm): FieldErrors {
  const errors: FieldErrors = {}
  const name = form.full_name.trim()
  const fatherName = form.father_name.trim()
  const email = form.email.trim()
  const phone = form.phone.trim()

  if (!name) errors.full_name = 'Full name is required.'
  else if (name.length < 2) errors.full_name = 'Full name must be at least 2 characters.'
  else if (!NAME_RE.test(name)) errors.full_name = 'Use letters only (spaces, - and . are allowed).'

  if (!fatherName) errors.father_name = 'Father name is required.'
  else if (fatherName.length < 2) errors.father_name = 'Father name must be at least 2 characters.'
  else if (!NAME_RE.test(fatherName)) errors.father_name = 'Use letters only (spaces, - and . are allowed).'

  if (email && !EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.'

  if (phone) {
    const digits = phone.replace(/\D/g, '')
    if (!PHONE_RE.test(phone) || digits.length < 7 || digits.length > 15) {
      errors.phone = 'Enter a valid phone number (7–15 digits).'
    }
  }

  if (!form.class_id) errors.class_id = 'Please select a class.'
  if (!form.enroll_date) errors.enroll_date = 'Enroll date is required.'
  else if (form.enroll_date > todayStr()) errors.enroll_date = 'Enroll date cannot be in the future.'

  return errors
}

function errorInputClass(hasError: boolean) {
  return hasError
    ? '!border-destructive !ring-1 !ring-destructive/30 focus-visible:!ring-destructive/50'
    : undefined
}

export default function StudentsPage() {
  const { user } = useOutletContext<{ user: User }>()
  const canView = canViewStudents(user.role)
  const canManage = canManageStudents(user.role)

  const [items, setItems] = useState<Student[]>([])
  const [classes, setClasses] = useState<CourseClass[]>([])
  const [form, setForm] = useState<StudentForm>({ ...emptyForm, enroll_date: todayStr() })
  const [nextCode, setNextCode] = useState('STU-0001')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [q, setQ] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const panelTitle = useMemo(
    () => (editingId ? 'Edit student' : 'Create student'),
    [editingId]
  )

  function updateField<K extends keyof StudentForm>(key: K, value: StudentForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setFieldErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
    if (error) setError('')
  }

  async function refreshNextCode() {
    if (!canManage) return
    try {
      const data = await apiGet<{ student_code: string }>('/api/students/next-code')
      setNextCode(data.student_code)
    } catch {
      /* keep last preview */
    }
  }

  async function load(search = q, selectedClass = classFilter) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (selectedClass) params.set('class_id', selectedClass)
      const query = params.toString() ? `?${params.toString()}` : ''

      const [students, classList] = await Promise.all([
        apiGet<Student[]>(`/api/students${query}`),
        apiGet<CourseClass[]>('/api/classes'),
      ])
      setItems(students)
      setClasses(classList)
      await refreshNextCode()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canView) return
    void load('', '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView])

  if (!canView) return <Navigate to="/dashboard" replace />

  function openCreate() {
    setEditingId(null)
    setForm({ ...emptyForm, enroll_date: todayStr() })
    setFieldErrors({})
    setError('')
    setPanelOpen(true)
  }

  function startEdit(item: Student) {
    setEditingId(item.id)
    setForm({
      student_code: item.student_code,
      full_name: item.full_name,
      father_name: item.father_name || '',
      email: item.email || '',
      phone: item.phone || '',
      class_id: item.class_id ? String(item.class_id) : '',
      enroll_date: item.enroll_date ? String(item.enroll_date).slice(0, 10) : todayStr(),
      status: item.status,
    })
    setFieldErrors({})
    setError('')
    setPanelOpen(true)
  }

  function closePanel() {
    setPanelOpen(false)
    setEditingId(null)
    setForm({ ...emptyForm, enroll_date: todayStr() })
    setFieldErrors({})
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canManage) return

    const errors = validateStudentForm(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError('Please fix the highlighted fields.')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      full_name: form.full_name.trim(),
      father_name: form.father_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      class_id: Number(form.class_id),
      enroll_date: form.enroll_date,
      status: form.status,
    }

    try {
      if (editingId) {
        await apiSend<Student>(`/api/students/${editingId}`, 'PUT', payload)
      } else {
        await apiSend<Student>('/api/students', 'POST', payload)
      }
      closePanel()
      await load(q, classFilter)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(id: number) {
    if (!canManage) return
    if (!confirm('Delete this student? Codes will be renumbered automatically.')) return
    try {
      await apiSend(`/api/students/${id}`, 'DELETE')
      if (editingId === id) closePanel()
      await load(q, classFilter)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const colSpan = canManage ? 7 : 6

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Manage student enrollment, contact details, and class assignments."
        actions={
          canManage ? (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="size-4" />
              Create student
            </Button>
          ) : undefined
        }
      />

      {error && !panelOpen ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <PageToolbar>
        <form
          className="flex w-full flex-col gap-3 sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault()
            void load(q, classFilter)
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, code, or email…"
              className="pl-9"
            />
          </div>
          <SelectField
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="sm:w-52"
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <Button type="submit" variant="secondary">
            Apply filters
          </Button>
        </form>
      </PageToolbar>

      <div>
        <DataTable minWidth="800px">
          <DataTableHead>
            <DataTableHeaderCell>Code</DataTableHeaderCell>
            <DataTableHeaderCell>Student</DataTableHeaderCell>
            <DataTableHeaderCell>Father</DataTableHeaderCell>
            <DataTableHeaderCell>Class</DataTableHeaderCell>
            <DataTableHeaderCell>Status</DataTableHeaderCell>
            <DataTableHeaderCell>Phone</DataTableHeaderCell>
            {canManage ? <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell> : null}
          </DataTableHead>
          <DataTableBody>
            {items.map((item) => (
              <DataTableRow key={item.id}>
                <DataTableCell className="font-mono text-xs">{item.student_code}</DataTableCell>
                <DataTableCell>
                  <div className="font-medium">{item.full_name}</div>
                  <div className="text-xs text-muted-foreground">{item.email || '—'}</div>
                </DataTableCell>
                <DataTableCell className="text-muted-foreground">{item.father_name || '—'}</DataTableCell>
                <DataTableCell className="text-muted-foreground">{item.class_name || '—'}</DataTableCell>
                <DataTableCell>
                  <StatusBadge status={item.status} />
                </DataTableCell>
                <DataTableCell className="text-muted-foreground">{item.phone || '—'}</DataTableCell>
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
              <DataTableEmpty colSpan={colSpan} message="No students found." />
            ) : null}
            {loading ? <DataTableEmpty colSpan={colSpan} loading /> : null}
          </DataTableBody>
        </DataTable>
        <DataTableFooter>
          <span>{loading ? 'Loading…' : `${items.length} student(s)`}</span>
          <span className="inline-flex items-center gap-1">
            <MoreHorizontal className="size-3.5" />
            Use filters to narrow results
          </span>
        </DataTableFooter>
      </div>

      <Modal
        open={panelOpen}
        onClose={closePanel}
        title={panelTitle}
        description="Required fields are marked with *. Student code is auto-generated."
        footer={
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={closePanel}>
              Cancel
            </Button>
            <Button type="submit" form="student-form" disabled={saving} className="flex-1">
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create student'}
            </Button>
          </div>
        }
      >
        {error && panelOpen ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <form id="student-form" className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="stu-code">Student code</Label>
            <Input
              id="stu-code"
              value={editingId ? form.student_code : nextCode}
              readOnly
              className="bg-muted/50 font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stu-name">
              Full name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="stu-name"
              value={form.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
              placeholder="e.g. Ahmad Karimi"
              className={errorInputClass(Boolean(fieldErrors.full_name))}
            />
            {fieldErrors.full_name ? (
              <p className="text-xs text-destructive">{fieldErrors.full_name}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="stu-father">
              Father name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="stu-father"
              value={form.father_name}
              onChange={(e) => updateField('father_name', e.target.value)}
              className={errorInputClass(Boolean(fieldErrors.father_name))}
            />
            {fieldErrors.father_name ? (
              <p className="text-xs text-destructive">{fieldErrors.father_name}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stu-email">Email</Label>
              <Input
                id="stu-email"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={errorInputClass(Boolean(fieldErrors.email))}
              />
              {fieldErrors.email ? (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="stu-phone">Phone</Label>
              <Input
                id="stu-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className={errorInputClass(Boolean(fieldErrors.phone))}
              />
              {fieldErrors.phone ? (
                <p className="text-xs text-destructive">{fieldErrors.phone}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stu-class">
              Class <span className="text-destructive">*</span>
            </Label>
            <SelectField
              id="stu-class"
              value={form.class_id}
              onChange={(e) => updateField('class_id', e.target.value)}
              hasError={Boolean(fieldErrors.class_id)}
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectField>
            {fieldErrors.class_id ? (
              <p className="text-xs text-destructive">{fieldErrors.class_id}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stu-enroll">
                Enroll date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="stu-enroll"
                type="date"
                value={form.enroll_date}
                max={todayStr()}
                onChange={(e) => updateField('enroll_date', e.target.value)}
                className={errorInputClass(Boolean(fieldErrors.enroll_date))}
              />
              {fieldErrors.enroll_date ? (
                <p className="text-xs text-destructive">{fieldErrors.enroll_date}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="stu-status">Status</Label>
              <SelectField
                id="stu-status"
                value={form.status}
                onChange={(e) => updateField('status', e.target.value as 'active' | 'inactive')}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectField>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
