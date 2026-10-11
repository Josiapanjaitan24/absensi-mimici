import { useAuth } from '../context/auth'

export function EmployeeProfile() {
  const { user } = useAuth()
  const details = [
    { label: 'Nama lengkap', value: user?.nama_lengkap },
    { label: 'Nama pengguna', value: user?.nama_pengguna },
    { label: 'Peran', value: user?.peran === 'karyawan' ? 'Karyawan' : user?.peran },
    { label: 'Status akun', value: user?.status_aktif ? 'Aktif' : user?.status_aktif === false ? 'Nonaktif' : null },
  ].filter((item) => item.value)

  return (
    <div className="dashboard-stack">
      <div className="page-heading">
        <p className="section-kicker">Akun Anda</p>
        <h3>Profil</h3>
        <p>Informasi profil yang disediakan oleh sistem autentikasi.</p>
      </div>
      <section className="panel-block profile-panel">
        {details.length === 0
          ? <p className="empty-state">Informasi profil belum tersedia.</p>
          : details.map((item) => (
            <div className="profile-field" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        <p className="helper-text">Pengubahan nama pengguna dan kata sandi belum tersedia di aplikasi.</p>
      </section>
    </div>
  )
}
