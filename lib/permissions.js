/**
 * Central permission definitions for Course MIS (backend source of truth).
 */

const ROLES = ['admin', 'finance', 'teachers', 'reception', 'students'];

const PERMISSIONS = {
  'dashboard.view': {
    label: 'View dashboard',
    group: 'General',
    description: 'Access the main dashboard overview.',
  },
  'password.change': {
    label: 'Change own password',
    group: 'General',
    description: 'Update their own login password.',
  },
  'roles.view': {
    label: 'View roles & permissions',
    group: 'Administration',
    description: 'See the role matrix and permission details.',
  },
  'users.manage': {
    label: 'Manage users',
    group: 'Administration',
    description: 'Create, edit, and delete user accounts and assign roles.',
  },
  'classes.view': {
    label: 'View classes',
    group: 'Academic',
    description: 'See training classes and course details.',
  },
  'classes.manage': {
    label: 'Manage classes',
    group: 'Academic',
    description: 'Create, edit, and delete classes and assign teachers.',
  },
  'students.view': {
    label: 'View students',
    group: 'Academic',
    description: 'See student records and enrollment information.',
  },
  'students.manage': {
    label: 'Manage students',
    group: 'Academic',
    description: 'Enroll, edit, and remove student records.',
  },
  'attendance.manage': {
    label: 'Mark attendance',
    group: 'Academic',
    description: 'Record daily student attendance.',
  },
  'fees.view': {
    label: 'View fees',
    group: 'Finance',
    description: 'See fee bills and payment status.',
  },
  'fees.manage': {
    label: 'Manage fee bills',
    group: 'Finance',
    description: 'Create, update, and delete fee bills and payments.',
  },
  'fee_types.manage': {
    label: 'Manage fee types',
    group: 'Finance',
    description: 'Create and edit fee type definitions.',
  },
};

const ROLE_META = {
  admin: {
    label: 'Admin',
    description: 'Full system access. Manages users, roles, classes, students, attendance, and fees.',
    color: 'primary',
  },
  finance: {
    label: 'Finance',
    description: 'Handles fee types, bills, and payments. Can view students and classes.',
    color: 'emerald',
  },
  teachers: {
    label: 'Teachers',
    description: 'Assigned to one class. Views own class students and marks attendance.',
    color: 'blue',
  },
  reception: {
    label: 'Reception',
    description: 'Front desk operations: students, classes, attendance, and fee collection.',
    color: 'amber',
  },
  students: {
    label: 'Students',
    description: 'Student portal login linked to enrollment record. Limited dashboard access.',
    color: 'slate',
  },
};

const ROLE_PERMISSIONS = {
  admin: Object.keys(PERMISSIONS),
  finance: [
    'dashboard.view',
    'password.change',
    'classes.view',
    'students.view',
    'fees.view',
    'fees.manage',
    'fee_types.manage',
  ],
  teachers: [
    'dashboard.view',
    'password.change',
    'classes.view',
    'students.view',
    'attendance.manage',
  ],
  reception: [
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
  students: ['dashboard.view', 'password.change'],
};

function isValidRole(role) {
  return ROLES.includes(role);
}

function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || [];
}

function hasPermission(role, permission) {
  return getPermissionsForRole(role).includes(permission);
}

function hasAnyPermission(role, permissions) {
  return permissions.some((p) => hasPermission(role, p));
}

function getAllRoles() {
  return ROLES.map((id) => ({
    id,
    label: ROLE_META[id].label,
    description: ROLE_META[id].description,
    color: ROLE_META[id].color,
    permissions: getPermissionsForRole(id),
  }));
}

function getRoleDetail(role) {
  if (!isValidRole(role)) return null;
  return {
    id: role,
    label: ROLE_META[role].label,
    description: ROLE_META[role].description,
    color: ROLE_META[role].color,
    permissions: getPermissionsForRole(role).map((key) => ({
      key,
      ...PERMISSIONS[key],
    })),
  };
}

function getPermissionMatrix() {
  const groups = [...new Set(Object.values(PERMISSIONS).map((p) => p.group))];
  return groups.map((group) => ({
    group,
    permissions: Object.entries(PERMISSIONS)
      .filter(([, meta]) => meta.group === group)
      .map(([key, meta]) => ({
        key,
        label: meta.label,
        description: meta.description,
        roles: ROLES.reduce((acc, role) => {
          acc[role] = hasPermission(role, key);
          return acc;
        }, {}),
      })),
  }));
}

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_META,
  ROLE_PERMISSIONS,
  isValidRole,
  getPermissionsForRole,
  hasPermission,
  hasAnyPermission,
  getAllRoles,
  getRoleDetail,
  getPermissionMatrix,
};
