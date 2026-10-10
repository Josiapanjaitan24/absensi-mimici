import { useEffect, useState } from 'react'

export function HomePage() {
  const [cabang, setCabang] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const ambilDataCabang = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/cabang')
        const hasil = await response.json()

        if (!response.ok || !hasil.success) {
          throw new Error('Gagal mengambil data cabang.')
        }

        setCabang(hasil.data ?? [])
      } catch (err) {
        console.error('Kesalahan mengambil data cabang:', err)
        setError('Data cabang gagal dimuat. Pastikan backend berjalan.')
      } finally {
        setLoading(false)
      }
    }

    ambilDataCabang()
  }, [])

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

        {error && <p className="empty-state error">{error}</p>}

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
