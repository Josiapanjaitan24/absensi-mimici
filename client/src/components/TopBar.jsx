import { useAuth } from '../context/auth'

export function TopBar({ title, subtitle }) {
  const { user, logout } = useAuth()

  return (
    <header className="top-bar">
      <div>
        <p className="top-bar-label">Dashboard</p>
        <h2>{title}</h2>
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
          <button type="button" className="ghost-button" onClick={logout}>
            Keluar
          </button>
        )}
      </div>
    </header>
  )
}
