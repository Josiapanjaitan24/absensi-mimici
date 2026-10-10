import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/auth'

export function Sidebar() {
  const { user } = useAuth()

  const navItems = [
    { to: '/', label: 'Beranda', icon: '⌂' },
    ...(user?.peran === 'karyawan' ? [
      { to: '/karyawan', label: 'Ringkasan', icon: '◌', end: true },
      { to: '/karyawan/jadwal', label: 'Jadwal', icon: '▦' },
      { to: '/karyawan/absensi', label: 'Absensi', icon: '◷' },
      { to: '/karyawan/riwayat', label: 'Riwayat', icon: '↺' },
      { to: '/karyawan/pengajuan', label: 'Pengajuan', icon: '＋' },
    ] : []),
    ...(user?.peran === 'admin' ? [{ to: '/admin', label: 'Admin', icon: '▣' }] : []),
  ]

  return (
    <aside className="sidebar" aria-label="Navigasi utama">
      <div className="brand-lockup">
        <div className="brand-mark">M</div>
        <div>
          <p className="brand-kicker">Mimici</p>
          <h1>Absensi</h1>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end || item.to === '/'}
            className={({ isActive }) =>
              isActive ? 'nav-item active' : 'nav-item'
            }
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        {!user && (
          <NavLink to="/login" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon" aria-hidden="true">↗</span>
            <span>Login</span>
          </NavLink>
        )}
      </nav>

      <div className="sidebar-panel">
        <p className="panel-label">Status proyek</p>
        <strong>{user ? `Peran: ${user.peran}` : 'Guest access'}</strong>
        <span>{user ? 'Akses pada sesi aktif dibatasi oleh backend.' : 'Login diperlukan untuk masuk ke area terproteksi.'}</span>
      </div>
    </aside>
  )
}
