import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { getNavItems } from './navigation'

export function TopBar({
  title,
  subtitle,
  mobileMenuOpen,
  onToggleMobileMenu,
  onCloseMobileMenu,
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const navItems = getNavItems(user)

  return (
    <header className="top-bar">
      <div className="top-bar-heading">
        <div>
          <p className="top-bar-label">Dashboard</p>
          <h2>{title}</h2>
        </div>
        <div
          className="mobile-nav-wrap"
          onKeyDown={(event) => {
            if (event.key === 'Escape') onCloseMobileMenu()
          }}
        >
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={onToggleMobileMenu}
          >
            <span className={mobileMenuOpen ? 'menu-icon is-open' : 'menu-icon'} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>Menu</span>
          </button>
          {mobileMenuOpen && (
            <nav className="mobile-nav-dropdown" id="mobile-navigation" aria-label="Navigasi utama">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end || item.to === '/'}
                  className={({ isActive }) => isActive ? 'mobile-nav-item active' : 'mobile-nav-item'}
                  onClick={onCloseMobileMenu}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
      </div>

      <div className="top-bar-meta">
        <div className="timezone-pill">WIB</div>
        <div className="user-chip">
          <span className="user-avatar" aria-hidden="true">{user?.nama_pengguna?.slice(0, 1).toUpperCase() || 'G'}</span>
          <div>
            <strong>{user ? user.nama_pengguna : 'Pengunjung'}</strong>
            <small>{user ? user.peran : subtitle}</small>
          </div>
        </div>

        {user && (
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              logout()
              navigate(user.peran === 'admin' ? '/admin' : '/', { replace: true })
            }}
          >
            Keluar
          </button>
        )}
      </div>
    </header>
  )
}
