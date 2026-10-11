export function getNavItems(user) {
  return [
    ...(user?.peran === 'karyawan' ? [
      { to: '/', label: 'Beranda', end: true },
      { to: '/absensi', label: 'Absensi' },
      { to: '/riwayat', label: 'Riwayat' },
      { to: '/pengajuan', label: 'Pengajuan' },
      { to: '/profil', label: 'Profil' },
    ] : []),
    ...(user?.peran === 'admin' ? [
      { to: '/admin', label: 'Dashboard', end: true },
      { to: '/admin/cabang', label: 'Cabang' },
      { to: '/admin/rekap-bulanan', label: 'Rekap Bulanan' },
      { to: '/admin/pengajuan', label: 'Pengajuan' },
    ] : []),
  ]
}
