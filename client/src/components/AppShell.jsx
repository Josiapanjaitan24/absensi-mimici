import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

const pageMetadata = {
  '/': {
    title: 'Beranda Mimici',
    subtitle: 'Overview cabang aktif',
  },
  '/karyawan': {
    title: 'Dashboard Karyawan',
    subtitle: 'Layanan absensi dan jadwal',
  },
  '/karyawan/jadwal': {
    title: 'Jadwal Kerja',
    subtitle: 'Jadwal pribadi dari database',
  },
  '/karyawan/absensi': {
    title: 'Absensi',
    subtitle: 'Validasi lokasi oleh backend',
  },
  '/karyawan/riwayat': {
    title: 'Riwayat Absensi',
    subtitle: 'Catatan kehadiran tersimpan',
  },
  '/karyawan/pengajuan': {
    title: 'Pengajuan',
    subtitle: 'Izin, sakit, dan perubahan jadwal',
  },
  '/admin': {
    title: 'Dashboard Admin',
    subtitle: 'Monitoring operasional cabang',
  },
}

export function AppShell() {
  const location = useLocation()

  if (location.pathname === '/login') {
    return <Outlet />
  }

  const current = pageMetadata[location.pathname] ?? {
    title: 'Absensi Mimici',
    subtitle: 'Arsitektur aplikasi aktif',
  }

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="content-shell">
        <TopBar title={current.title} subtitle={current.subtitle} />

        <main className="page-shell">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
