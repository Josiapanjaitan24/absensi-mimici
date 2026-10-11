import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { getAdminDashboard } from '../services/adminApi'

const metrics = [
  { key: 'cabang_aktif', label: 'Cabang aktif', detail: 'Cabang operasional', tone: 'primary' },
  { key: 'karyawan_aktif', label: 'Karyawan aktif', detail: 'Profil aktif', tone: 'success' },
  { key: 'jadwal_hari_ini', label: 'Jadwal hari ini', detail: 'Jadwal terjadwal', tone: 'neutral' },
  { key: 'absensi_masuk_hari_ini', label: 'Absensi masuk', detail: 'Hari ini · WIB', tone: 'success' },
  { key: 'pengajuan_menunggu', label: 'Menunggu persetujuan', detail: 'Izin dan perubahan jadwal', tone: 'warning' },
]

const formatCount = (value) => Number(value ?? 0).toLocaleString('id-ID')

export function AdminDashboard() {
  const { token } = useAuth()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true

    getAdminDashboard(token)
      .then((data) => {
        if (active) {
          setSummary(data)
          setError('')
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [token, refreshKey])

  return (
    <div className="dashboard-stack">
      <section className="admin-dashboard-heading">
        <div className="page-heading">
          <p className="section-kicker">Ringkasan operasional</p>
          <h3>Dashboard admin</h3>
          <p>Angka di bawah diambil langsung dari data operasional untuk hari ini.</p>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setLoading(true)
            setError('')
            setRefreshKey((value) => value + 1)
          }}
          disabled={loading}
        >
          Perbarui data
        </button>
      </section>

      {error && <p className="empty-state error" role="alert">{error}</p>}

      <section className="stats-grid admin-stats-grid" aria-label="Ringkasan data operasional">
        {metrics.map((item) => (
          <article key={item.key} className="stat-card admin">
            <p>{item.label}</p>
            <strong aria-live="polite">
              {loading ? '…' : error ? '—' : formatCount(summary?.[item.key])}
            </strong>
            <span className={`tag ${item.tone}`}>{item.detail}</span>
          </article>
        ))}
      </section>

      {!loading && !error && !summary && (
        <p className="empty-state">Ringkasan belum tersedia. Coba perbarui data.</p>
      )}

      <section className="panel-block admin-quick-link">
        <div>
          <p className="section-kicker">Pengaturan dasar</p>
          <h3>Kelola cabang</h3>
          <p>Lihat cabang yang tersedia, atur status aktif, dan perbarui radius GPS.</p>
        </div>
        <Link className="primary-button" to="/admin/cabang">Buka pengelolaan cabang</Link>
      </section>
      <section className="panel-block admin-quick-link">
        <div>
          <p className="section-kicker">Pelaporan</p>
          <h3>Rekap absensi bulanan</h3>
          <p>Pratinjau seluruh cabang dan unduh satu file Excel berdasarkan periode.</p>
        </div>
        <Link className="secondary-button" to="/admin/rekap-bulanan">Buka rekap bulanan</Link>
      </section>
      <section className="panel-block admin-quick-link">
        <div>
          <p className="section-kicker">Permintaan karyawan</p>
          <h3>Pengajuan izin dan perubahan jadwal</h3>
          <p>Lihat alasan, tanggal, dan status seluruh pengajuan yang dikirim karyawan.</p>
        </div>
        <Link className="secondary-button" to="/admin/pengajuan">Lihat pengajuan</Link>
      </section>
    </div>
  )
}
