import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

const pageMetadata = {
  '/': {
    title: 'Beranda Mimici',
    subtitle: 'Overview cabang aktif',
  },
  '/absensi': {
    title: 'Absensi',
    subtitle: 'Validasi lokasi oleh backend',
  },
  '/riwayat': {
    title: 'Riwayat Absensi',
    subtitle: 'Catatan kehadiran tersimpan',
  },
  '/pengajuan': {
    title: 'Pengajuan',
    subtitle: 'Izin, sakit, dan perubahan jadwal',
  },
  '/profil': {
    title: 'Profil',
    subtitle: 'Informasi akun Anda',
  },
  '/admin': {
    title: 'Dashboard Admin',
    subtitle: 'Monitoring operasional cabang',
  },
  '/admin/cabang': {
    title: 'Pengelolaan Cabang',
    subtitle: 'Status dan radius GPS cabang',
  },
  '/admin/rekap-bulanan': {
    title: 'Rekap Bulanan',
    subtitle: 'Pratinjau dan ekspor absensi Excel',
  },
  '/admin/pengajuan': {
    title: 'Pengajuan Karyawan',
    subtitle: 'Pengajuan izin, sakit, dan perubahan jadwal',
  },
}

export function AppShell({ children }) {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const current = pageMetadata[location.pathname] ?? {
    title: 'Absensi Mimici',
    subtitle: 'Arsitektur aplikasi aktif',
  }

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="content-shell">
        <TopBar
          title={current.title}
          subtitle={current.subtitle}
          mobileMenuOpen={mobileMenuOpen}
          onToggleMobileMenu={() => setMobileMenuOpen((open) => !open)}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />

        <main className="page-shell">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  )
}
