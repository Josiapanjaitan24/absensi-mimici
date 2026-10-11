
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Component } from 'react'
import { AppShell } from './components/AppShell'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/auth'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminBranches } from './pages/AdminBranches'
import { EmployeeDashboard } from './pages/EmployeeDashboard'
import { EmployeeProfile } from './pages/EmployeeProfile'
import {
  AttendanceHistoryPage,
  AttendancePage,
  EmployeeRequestsPage,
} from './pages/EmployeePages'
import { LoginPage } from './pages/LoginPage'
import { NotFound } from './pages/NotFound'
import { AdminMonthlyReport } from './pages/AdminMonthlyReport'
import { AdminRequestsPage } from './pages/AdminRequests'
import './App.css'

class PageErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('Halaman gagal dirender:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="panel-block page-render-error" role="alert">
          <h3>Halaman tidak dapat dimuat</h3>
          <p>Terjadi kesalahan saat menampilkan halaman ini. Muat ulang untuk mencoba kembali.</p>
          <button type="button" className="primary-button" onClick={() => window.location.reload()}>
            Muat ulang halaman
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function RoleArea({ role }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="loading-state">Memeriksa sesi pengguna...</div>
  }

  if (!user) {
    return <LoginPage audience={role} />
  }

  if (user.peran !== role) {
    return <Navigate to={user.peran === 'admin' ? '/admin' : '/'} replace />
  }

  return (
    <AppShell>
      <PageErrorBoundary>
        <Outlet />
      </PageErrorBoundary>
    </AppShell>
  )
}

function LegacyLoginRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-state">Memeriksa sesi pengguna...</div>
  return <Navigate to={user?.peran === 'admin' ? '/admin' : '/'} replace />
}

function LegacyEmployeeRedirect() {
  const location = useLocation()
  const suffix = location.pathname.replace(/^\/karyawan\/?/, '')
  const destinations = {
    '': '/',
    jadwal: '/',
    absensi: '/absensi',
    riwayat: '/riwayat',
    pengajuan: '/pengajuan',
    profil: '/profil',
  }

  return <Navigate to={destinations[suffix] ?? '/'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LegacyLoginRedirect />} />
      <Route path="/karyawan" element={<LegacyEmployeeRedirect />} />
      <Route path="/karyawan/*" element={<LegacyEmployeeRedirect />} />
      <Route path="/" element={<RoleArea role="karyawan" />}>
        <Route index element={<EmployeeDashboard />} />
        <Route path="jadwal" element={<Navigate to="/" replace />} />
        <Route path="absensi" element={<AttendancePage />} />
        <Route path="absensi/:branchSlug" element={<AttendancePage />} />
        <Route path="riwayat" element={<AttendanceHistoryPage />} />
        <Route path="pengajuan" element={<EmployeeRequestsPage />} />
        <Route path="profil" element={<EmployeeProfile />} />
      </Route>
      <Route path="/admin" element={<RoleArea role="admin" />}>
        <Route index element={<AdminDashboard />} />
        <Route path="cabang" element={<AdminBranches />} />
        <Route path="rekap-bulanan" element={<AdminMonthlyReport />} />
        <Route path="pengajuan" element={<AdminRequestsPage />} />
      </Route>
      <Route path="/404" element={<NotFound />} />
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