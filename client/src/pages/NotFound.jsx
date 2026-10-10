import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <section className="panel-block not-found">
      <p className="eyebrow">404</p>
      <h3>Halaman tidak ditemukan</h3>
      <p>Rute yang Anda buka belum tersedia pada arsitektur fase 1.</p>
      <Link to="/" className="primary-button">
        Kembali ke beranda
      </Link>
    </section>
  )
}
