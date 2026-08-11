export type Role =
  | 'admin'
  | 'finance'
  | 'teachers'
  | 'reception'
  | 'students'

export type User = {
  id: number
  name: string
  email: string
  role: Role
  permissions?: string[]
}

export type ManagedUser = {
  id: number
  name: string
  email: string
  role: Role
  class_id?: number | null
  class_name?: string | null
  created_at?: string
}

export type Student = {
  id: number
  student_code: string
  full_name: string
  father_name: string | null
  email: string | null
  phone: string | null
  class_id: number | null
  class_name: string | null
  enroll_date: string | null
  status: 'active' | 'inactive'
  created_at?: string
}

export type CourseClass = {
  id: number
  name: string
  description: string | null
  teacher_id: number | null
  teacher_name: string | null
  student_count: number | string
  created_at?: string
}

export type AssignableTeacher = {
  id: number
  name: string
  email: string
}

export type StudentAttendance = {
  id: number
  student_id: number
  student_code: string
  full_name: string
  class_id?: number | null
  class_name: string | null
  date: string
  status: 'present' | 'absent' | 'late'
  note: string | null
}

export type StudentAttendanceSummary = {
  date: string
  present_count: number
  absent_count: number
  late_count: number
  total_marked: number
}

export type FeeType = {
  id: number
  name: string
  description: string | null
  default_amount: number | string
  created_at?: string
}

export type FeePayment = {
  id: number | null
  student_id: number
  student_code: string
  full_name: string
  fee_type_id: number | null
  fee_type_name: string | null
  amount: number | string
  paid_amount: number | string
  month: number
  year: number
  due_date: string | null
  status: 'unpaid' | 'partial' | 'paid'
  paid_at: string | null
  note: string | null
  created_at?: string | null
  missing_bill?: boolean
}

export type FeeSummary = {
  year: number
  month: number | null
  total_bills: number
  unpaid_count: number
  unpaid_bills?: number
  missing_bill_count?: number
  partial_count: number
  paid_count: number
  total_amount: number
  collected_amount: number
}

export type RoleDefinition = {
  id: Role
  label: string
  description: string
  color: string
  permissions: string[]
  user_count: number
}

export type PermissionMatrixGroup = {
  group: string
  permissions: {
    key: string
    label: string
    description: string
    roles: Record<Role, boolean>
  }[]
}

export type PermissionMatrix = {
  permissions: Record<string, { label: string; group: string; description: string }>
  matrix: PermissionMatrixGroup[]
}

export type DashboardAnalytics = {
  fee_collection?: { month: string; billed: number; collected: number }[]
  fee_status?: { name: string; value: number; color: string }[]
  attendance_trend?: { date: string; label: string; present: number; absent: number }[]
  students_by_class?: { class: string; students: number }[]
}

async function parseJson(res: Response) {
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(
      res.status === 401
        ? 'Please log in again.'
        : 'Server returned a non-JSON response. Restart the Node server and try again.'
    )
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Request failed')
  }
  return data
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  return parseJson(res) as Promise<T>
}

export async function apiSend<T>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return parseJson(res) as Promise<T>
}
