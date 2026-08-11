import { useEffect, useMemo, useState } from 'react'
import { Navigate, useOutletContext } from 'react-router-dom'
import { CheckSquare, Save, Square } from 'lucide-react'

import {
  AttendanceSavedModal,
  type AttendanceSavedInfo,
} from '@/components/AttendanceSavedModal'
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
import { StatCards } from '@/components/layout/StatCards'
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
  type StudentAttendance,
  type StudentAttendanceSummary,
  type User,
} from '@/lib/api'
import { canMarkAttendance } from '@/lib/permissions'
import { cn } from '@/lib/utils'

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function StudentAttendancePage() {
  const { user } = useOutletContext<{ user: User }>()
  const canManage = canMarkAttendance(user.role)

  const [date, setDate] = useState(today())
  const [classId, setClassId] = useState('')
  const [classes, setClasses] = useState<CourseClass[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [presentIds, setPresentIds] = useState<Set<number>>(new Set())
  const [summary, setSummary] = useState<StudentAttendanceSummary | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedInfo, setSavedInfo] = useState<AttendanceSavedInfo | null>(null)

  const selectedClass = useMemo(
    () => classes.find((c) => String(c.id) === classId) || null,
    [classes, classId]
  )

  async function loadClasses() {
    const list = await apiGet<CourseClass[]>('/api/classes')
    setClasses(list)
    if (!classId && list.length === 1) setClassId(String(list[0].id))
  }

  async function loadRoster(selectedDate = date, selectedClassId = classId) {
    if (!selectedClassId) {
      setStudents([])
      setPresentIds(new Set())
      setSummary(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const [classStudents, attendance, sum] = await Promise.all([
        apiGet<Student[]>(`/api/students?status=active&class_id=${selectedClassId}`),
        apiGet<StudentAttendance[]>(
          `/api/student-attendance?date=${selectedDate}&class_id=${selectedClassId}`
        ),
        apiGet<StudentAttendanceSummary>(
          `/api/student-attendance/summary?date=${selectedDate}&class_id=${selectedClassId}`
        ),
      ])

      setStudents(classStudents)
      setSummary(sum)

      const nextPresent = new Set<number>()
      for (const row of attendance) {
        if (row.status === 'present' || row.status === 'late') {
          nextPresent.add(row.student_id)
        }
      }
      setPresentIds(nextPresent)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canManage) return
    void (async () => {
      try {
        await loadClasses()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load classes')
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage])

  useEffect(() => {
    if (!canManage) return
    void loadRoster(date, classId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, classId])

  if (!canManage) return <Navigate to="/dashboard" replace />

  function togglePresent(studentId: number) {
    setPresentIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  function selectAll() {
    setPresentIds(new Set(students.map((s) => s.id)))
  }

  function clearAll() {
    setPresentIds(new Set())
  }

  async function saveAttendance() {
    if (!classId) {
      setError('Please select a class first.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const present = presentIds.size
      const total = students.length
      const absent = Math.max(total - present, 0)

      await apiSend('/api/student-attendance/bulk', 'POST', {
        date,
        class_id: Number(classId),
        present_ids: [...presentIds],
      })
      await loadRoster(date, classId)
      setSavedInfo({
        className: selectedClass?.name || 'Class',
        date,
        present,
        absent,
        total,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const presentCount = presentIds.size
  const absentCount = Math.max(students.length - presentCount, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Select a class and date, mark present students, then save."
        actions={
          classId && students.length > 0 ? (
            <Button onClick={() => void saveAttendance()} disabled={saving} className="gap-2">
              <Save className="size-4" />
              {saving ? 'Saving…' : 'Save attendance'}
            </Button>
          ) : undefined
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <PageToolbar>
        <div className="flex w-full flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="att-date">Date</Label>
            <Input
              id="att-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="att-class">Class</Label>
            <SelectField
              id="att-class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="min-w-48"
            >
              <option value="">Select class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </SelectField>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void loadRoster(date, classId)}
            disabled={!classId}
          >
            Load roster
          </Button>
        </div>
      </PageToolbar>

      {classId ? (
        <>
          <StatCards
            items={[
              { label: 'Present', value: presentCount },
              { label: 'Absent', value: absentCount },
              { label: 'Total students', value: students.length },
            ]}
          />

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAll} className="gap-1.5">
              <CheckSquare className="size-3.5" />
              Mark all present
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearAll} className="gap-1.5">
              <Square className="size-3.5" />
              Clear all
            </Button>
          </div>

          <DataTable minWidth="560px">
            <DataTableHead>
              <DataTableHeaderCell className="w-12">
                <span className="sr-only">Present</span>
              </DataTableHeaderCell>
              <DataTableHeaderCell>Student</DataTableHeaderCell>
              <DataTableHeaderCell>Code</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
            </DataTableHead>
            <DataTableBody>
              {students.map((student) => {
                const checked = presentIds.has(student.id)
                return (
                  <DataTableRow
                    key={student.id}
                    className={cn(checked && 'bg-primary/5')}
                    onClick={() => togglePresent(student.id)}
                  >
                    <DataTableCell>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePresent(student.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="size-4 accent-primary"
                      />
                    </DataTableCell>
                    <DataTableCell className="font-medium">{student.full_name}</DataTableCell>
                    <DataTableCell className="font-mono text-xs text-muted-foreground">
                      {student.student_code}
                    </DataTableCell>
                    <DataTableCell>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                          checked
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                            : 'bg-slate-100 text-slate-600 ring-slate-500/10'
                        )}
                      >
                        {checked ? 'Present' : 'Absent'}
                      </span>
                    </DataTableCell>
                  </DataTableRow>
                )
              })}
              {!loading && students.length === 0 ? (
                <DataTableEmpty colSpan={4} message="No active students in this class." />
              ) : null}
              {loading ? <DataTableEmpty colSpan={4} loading /> : null}
            </DataTableBody>
          </DataTable>
          <DataTableFooter>
            <span>
              {selectedClass?.name || 'Class'} · {date}
            </span>
            {summary ? (
              <span>
                Saved: {summary.present_count} present, {summary.absent_count} absent
              </span>
            ) : null}
          </DataTableFooter>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="font-medium text-foreground">Select a class to begin</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a class and date above to load the student roster.
          </p>
        </div>
      )}

      <AttendanceSavedModal
        open={Boolean(savedInfo)}
        info={savedInfo}
        onClose={() => setSavedInfo(null)}
      />
    </div>
  )
}
