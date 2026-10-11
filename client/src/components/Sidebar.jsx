import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { getNavItems } from './navigation'

export function Sidebar() {
  const { user } = useAuth()
  const navItems = getNavItems(user)

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
            <span>{item.label}</span>
          </NavLink>
        ))}

      </nav>

      <div className="sidebar-panel">
        <p className="panel-label">Status proyek</p>
        <strong>{`Peran: ${user?.peran}`}</strong>
        <span>Akses pada sesi aktif dibatasi oleh backend.</span>
      </div>
    </aside>
  )
}
