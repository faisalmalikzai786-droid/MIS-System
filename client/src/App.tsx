import { Navigate, Route, Routes } from 'react-router-dom'

import AppLayout from '@/components/AppLayout'
import ChangePasswordPage from '@/pages/ChangePasswordPage'
import ClassesPage from '@/pages/ClassesPage'
import DashboardPage from '@/pages/DashboardPage'
import FeesPage from '@/pages/FeesPage'
import StudentAttendancePage from '@/pages/StudentAttendancePage'
import StudentsPage from '@/pages/StudentsPage'
import UsersPage from '@/pages/UsersPage'
import RolesPage from '@/pages/RolesPage'
import LoginPage from '@/pages/LoginPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/student-attendance" element={<StudentAttendancePage />} />
        <Route path="/fees" element={<FeesPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/roles" element={<RolesPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
