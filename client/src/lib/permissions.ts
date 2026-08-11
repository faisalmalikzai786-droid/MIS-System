import type { Role } from '@/lib/api'

/** Permission keys — must match backend lib/permissions.js */
export type Permission =
  | 'dashboard.view'
  | 'password.change'
  | 'roles.view'
  | 'users.manage'
  | 'classes.view'
  | 'classes.manage'
  | 'students.view'
  | 'students.manage'
  | 'attendance.manage'
  | 'fees.view'
  | 'fees.manage'
  | 'fee_types.manage'

export const PERMISSION_LABELS: Record<Permission, { label: string; group: string }> = {
  'dashboard.view': { label: 'View dashboard', group: 'General' },
  'password.change': { label: 'Change own password', group: 'General' },
  'roles.view': { label: 'View roles & permissions', group: 'Administration' },
  'users.manage': { label: 'Manage users', group: 'Administration' },
  'classes.view': { label: 'View classes', group: 'Academic' },
  'classes.manage': { label: 'Manage classes', group: 'Academic' },
  'students.view': { label: 'View students', group: 'Academic' },
  'students.manage': { label: 'Manage students', group: 'Academic' },
  'attendance.manage': { label: 'Mark attendance', group: 'Academic' },
  'fees.view': { label: 'View fees', group: 'Finance' },
  'fees.manage': { label: 'Manage fee bills', group: 'Finance' },
  'fee_types.manage': { label: 'Manage fee types', group: 'Finance' },
}

export const ROLE_META: Record<
  Role,
  { label: string; description: string; permissions: Permission[] }
> = {
  admin: {
    label: 'Admin',
    description: 'Full system access. Manages users, roles, classes, students, attendance, and fees.',
    permissions: Object.keys(PERMISSION_LABELS) as Permission[],
  },
  finance: {
    label: 'Finance',
    description: 'Handles fee types, bills, and payments. Can view students and classes.',
    permissions: [
      'dashboard.view',
      'password.change',
      'classes.view',
      'students.view',
      'fees.view',
      'fees.manage',
      'fee_types.manage',
    ],
  },
  teachers: {
    label: 'Teachers',
    description: 'Assigned to one class. Views own class students and marks attendance.',
    permissions: [
      'dashboard.view',
      'password.change',
      'classes.view',
      'students.view',
      'attendance.manage',
    ],
  },
  reception: {
    label: 'Reception',
    description: 'Front desk: students, classes, attendance, and fee collection.',
    permissions: [
      'dashboard.view',
      'password.change',
      'classes.view',
      'classes.manage',
      'students.view',
      'students.manage',
      'attendance.manage',
      'fees.view',
      'fees.manage',
    ],
  },
  students: {
    label: 'Students',
    description: 'Student portal login linked to enrollment. Limited dashboard access.',
    permissions: ['dashboard.view', 'password.change'],
  },
}

export const ROLE_OPTIONS = Object.keys(ROLE_META) as Role[]

/** @deprecated Use ROLE_META[role].permissions summary via getRolePermissions */
export const ROLE_PERMISSIONS = Object.fromEntries(
  ROLE_OPTIONS.map((role) => [
    role,
    {
      label: ROLE_META[role].label,
      can: ROLE_META[role].permissions.map((p) => PERMISSION_LABELS[p].label),
    },
  ])
) as Record<Role, { label: string; can: string[] }>

export function getRolePermissions(role: Role): Permission[] {
  return ROLE_META[role]?.permissions ?? []
}

export function hasPermission(
  permissions: Permission[] | undefined,
  permission: Permission,
  role?: Role
): boolean {
  if (permissions?.length) return permissions.includes(permission)
  if (role) return getRolePermissions(role).includes(permission)
  return false
}

export function canViewClasses(role: Role, permissions?: Permission[]) {
  return hasPermission(permissions, 'classes.view', role)
}

export function canManageClasses(role: Role, permissions?: Permission[]) {
  return hasPermission(permissions, 'classes.manage', role)
}

export function canViewStudents(role: Role, permissions?: Permission[]) {
  return hasPermission(permissions, 'students.view', role)
}

export function canManageStudents(role: Role, permissions?: Permission[]) {
  return hasPermission(permissions, 'students.manage', role)
}

export function canMarkAttendance(role: Role, permissions?: Permission[]) {
  return hasPermission(permissions, 'attendance.manage', role)
}

export function canViewFees(role: Role, permissions?: Permission[]) {
  return hasPermission(permissions, 'fees.view', role)
}

export function canManageFees(role: Role, permissions?: Permission[]) {
  return hasPermission(permissions, 'fees.manage', role)
}

export function canManageUsers(role: Role, permissions?: Permission[]) {
  return hasPermission(permissions, 'users.manage', role)
}

export function canViewRoles(role: Role, permissions?: Permission[]) {
  return hasPermission(permissions, 'roles.view', role)
}
