import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { getEmployeeSchedules } from '../services/employeeApi'

const getJakartaDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())

const formatDate = (value) => new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'full',
  timeZone: 'Asia/Jakarta',
}).format(new Date(`${value}T12:00:00+07:00`))

export function EmployeeDashboard() {
  const { token, user } = useAuth()
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getEmployeeSchedules(token, getJakartaDate(), getJakartaDate())
      .then((rows) => {
        if (active) setSchedules(rows)
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
  }, [token])

  return (
    <div className="dashboard-stack">
      <section className="hero-panel employee-hero">
        <div>
          <p className="eyebrow">AREA KARYAWAN</p>
          <h3>Halo, <span>{user?.nama_lengkap || user?.nama_pengguna}</span></h3>
          <p>{formatDate(getJakartaDate())}. Informasi di halaman ini berasal dari akun dan jadwal Anda.</p>
        </div>
        <Link className="primary-button" to="/karyawan/absensi">Buka absensi</Link>
      </section>

      <section className="panel-block">
        <div className="panel-header">
          <div>
            <p className="section-kicker">Hari ini</p>
            <h3>Jadwal kerja saya</h3>
          </div>
          <Link className="text-link" to="/karyawan/jadwal">Lihat jadwal</Link>
        </div>

        {loading && <p className="empty-state" role="status">Memuat jadwal kerja...</p>}
        {error && <p className="empty-state error" role="alert">{error}</p>}
        {!loading && !error && schedules.length === 0 && (
          <div className="empty-state">
            Belum ada jadwal kerja yang tercatat untuk hari ini. Status alfa tidak disimpulkan dari jadwal yang kosong.
          </div>
        )}
        {!loading && !error && schedules.length > 0 && (
          <div className="employee-record-list">
            {schedules.map((schedule) => (
              <article className="employee-record" key={schedule.id_jadwal}>
                <div className="record-mark" aria-hidden="true">J</div>
                <div className="record-main">
                  <strong>{schedule.nama_shift || 'Shift belum ditentukan'}</strong>
                  <span>{schedule.nama_cabang} · {schedule.status_jadwal}</span>
                </div>
                <span className="record-time">
                  {schedule.jam_masuk && schedule.jam_pulang
                    ? `${schedule.jam_masuk.slice(0, 5)} – ${schedule.jam_pulang.slice(0, 5)}`
                    : 'Jam belum ditentukan'}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="employee-shortcuts">
        <Link to="/karyawan/riwayat" className="shortcut-card">
          <span className="shortcut-icon" aria-hidden="true">↺</span>
          <span><strong>Riwayat absensi</strong><small>Lihat catatan kehadiran tersimpan</small></span>
          <span className="shortcut-arrow" aria-hidden="true">→</span>
        </Link>
        <Link to="/karyawan/pengajuan" className="shortcut-card">
          <span className="shortcut-icon" aria-hidden="true">＋</span>
          <span><strong>Pengajuan</strong><small>Izin, sakit, atau perubahan jadwal</small></span>
          <span className="shortcut-arrow" aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  )
}
