
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { AdminDashboard } from './pages/AdminDashboard'
import { EmployeeDashboard } from './pages/EmployeeDashboard'
import {
  AttendanceHistoryPage,
  AttendancePage,
  EmployeeRequestsPage,
  EmployeeSchedulePage,
} from './pages/EmployeePages'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { NotFound } from './pages/NotFound'
import './App.css'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/karyawan"
          element={(
            <ProtectedRoute allowedRoles={['karyawan']}>
              <Outlet />
            </ProtectedRoute>
          )}
        >
          <Route index element={<EmployeeDashboard />} />
          <Route path="jadwal" element={<EmployeeSchedulePage />} />
          <Route path="absensi" element={<AttendancePage />} />
          <Route path="riwayat" element={<AttendanceHistoryPage />} />
          <Route path="pengajuan" element={<EmployeeRequestsPage />} />
        </Route>
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/404" element={<NotFound />} />
      </Route>

      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App