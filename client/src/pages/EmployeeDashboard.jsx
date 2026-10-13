import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { getAttendanceHistory } from '../services/employeeApi'
import { formatDate, formatDateTime, getJakartaDate } from '../utils/dateFormatting'

export function EmployeeDashboard() {
  const { token, user } = useAuth()
  const [recentRecords, setRecentRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const today = getJakartaDate()
  useEffect(() => {
    let active = true

    getAttendanceHistory(token)
      .then((history) => {
        if (!active) return
        setRecentRecords(history.slice(0, 3))
        setError('')
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
      <section className="employee-welcome">
        <div>
          <p className="section-kicker">Area karyawan</p>
          <h3>Halo, {user?.nama_lengkap || user?.nama_pengguna}</h3>
          <p>{formatDate(today, 'full')} · Pilih cabang untuk mencatat kehadiran Anda</p>
        </div>
        <Link className="primary-button" to="/absensi">Mulai absensi</Link>
      </section>

      {error && (
        <div className="error-box" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setLoading(true)
              setError('')
              setRefreshKey((value) => value + 1)
            }}
          >
            Coba lagi
          </button>
        </div>
      )}

      <section className="panel-block">
        <div className="panel-header">
          <div>
            <p className="section-kicker">Terbaru</p>
            <h3>Riwayat absensi</h3>
          </div>
          <Link className="text-link" to="/riwayat">Lihat semua</Link>
        </div>
        {loading && <p className="empty-state" role="status">Memuat riwayat absensi...</p>}
        {!loading && !error && recentRecords.length === 0 && (
          <p className="empty-state">Belum ada catatan absensi tersimpan.</p>
        )}
        {!loading && !error && recentRecords.length > 0 && (
          <div className="employee-record-list">
            {recentRecords.map((record) => (
              <article className="employee-record" key={record.id_absensi}>
                <div className="record-main">
                  <strong>{formatDate(record.tanggal_kerja, 'medium')}</strong>
                  <span>{record.nama_cabang} · {record.nama_shift || 'Shift belum ditentukan'}</span>
                </div>
                <div className="record-side">
                  <span className="record-time">{formatDateTime(record.waktu_masuk, 'Belum tercatat')}</span>
                  <span className="status-pill neutral">{record.status_kehadiran}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="employee-shortcuts" aria-label="Menu karyawan">
        <Link to="/absensi" className="shortcut-card">
          <span><strong>Absensi cabang</strong><small>Pilih lokasi untuk mencatat kehadiran</small></span>
          <span className="shortcut-arrow" aria-hidden="true">→</span>
        </Link>
        <Link to="/pengajuan" className="shortcut-card">
          <span><strong>Pengajuan</strong><small>Izin, sakit, dan perubahan jadwal</small></span>
          <span className="shortcut-arrow" aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  )
}
