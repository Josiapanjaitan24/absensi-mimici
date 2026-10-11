import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../services/apiConfig'

export function HomePage() {
  const [cabang, setCabang] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    const ambilDataCabang = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/cabang`)
        const hasil = await response.json()

        if (!response.ok || !hasil.success) {
          throw new Error('Gagal mengambil data cabang.')
        }

        if (active) {
          setCabang(hasil.data ?? [])
          setError('')
        }
      } catch (err) {
        console.error('Kesalahan mengambil data cabang:', err)
        if (active) setError('Data cabang gagal dimuat. Pastikan koneksi layanan tersedia.')
      } finally {
        if (active) setLoading(false)
      }
    }

    ambilDataCabang()
    return () => {
      active = false
    }
  }, [refresh])

  return (
    <>
      <section className="hero-panel">
        <div>
          <p className="eyebrow">SISTEM ABSENSI KARYAWAN</p>
          <h3>Selamat datang di <span>Absensi Mimici</span></h3>
          <p>
            Platform terstruktur untuk pengelolaan kehadiran karyawan,
            cabang, jadwal kerja, dan pengajuan operasional.
          </p>
        </div>
        <div className="hero-kpi">
          <span className="kpi-label">Cabang aktif</span>
          <strong>{loading ? '…' : error ? '—' : cabang.length}</strong>
          <small>{error ? 'Data belum tersedia' : 'Terhubung ke data backend'}</small>
        </div>
      </section>

      <section className="panel-block">
        <div className="panel-header">
          <div>
            <p className="section-kicker">Overview</p>
            <h3>Daftar cabang</h3>
          </div>
          {!loading && !error && <span className="badge-soft">{cabang.length} cabang</span>}
        </div>

        {loading && <p className="empty-state">Memuat data cabang...</p>}

        {error && (
          <div className="error-box" role="alert">
            <span>{error}</span>
            <button type="button" className="text-button" onClick={() => {
              setLoading(true)
              setError('')
              setRefresh((value) => value + 1)
            }}>
              Coba lagi
            </button>
          </div>
        )}

        {!loading && !error && (
          cabang.length === 0
            ? <p className="empty-state">Belum ada cabang aktif yang tercatat.</p>
            : (
              <div className="branch-grid">
                {cabang.map((item) => (
                  <article className="branch-card" key={item.id_cabang}>
                    <div className="branch-icon" aria-hidden="true">⌖</div>
                    <div className="branch-copy">
                      <h4>{item.nama_cabang}</h4>
                      <p>Radius absensi {item.radius_meter} meter</p>
                    </div>
                    <span className="status-pill success">Aktif</span>
                  </article>
                ))}
              </div>
            )
        )}
      </section>
    </>
  )
}
