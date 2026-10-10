import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, user } = useAuth()
  const [formData, setFormData] = useState({ nama_pengguna: '', kata_sandi: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) {
    const redirectPath = user.peran === 'admin' ? '/admin' : '/karyawan'
    return <Navigate to={redirectPath} replace />
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const authenticatedUser = await login(formData)
      const redirectTo = location.state?.from || (authenticatedUser.peran === 'admin' ? '/admin' : '/karyawan')
      navigate(redirectTo, { replace: true })
    } catch (loginError) {
      setError(loginError.message || 'Login gagal. Silakan coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-panel primary-panel">
          <p className="eyebrow">Mimici</p>
          <h1>Selamat datang kembali</h1>
          <p>
            Masuk untuk mengakses dashboard karyawan atau admin sesuai peran Anda.
          </p>
          <div className="auth-info-box">
            <strong>Autentikasi aktif</strong>
            <span>Backend memvalidasi token JWT untuk setiap permintaan yang membutuhkan akses.</span>
          </div>
        </div>

        <div className="auth-panel form-panel">
          <div className="auth-header">
            <p className="section-kicker">Login</p>
            <h2>Masuk ke akun</h2>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              <span>Nama pengguna</span>
              <input
                type="text"
                name="nama_pengguna"
                value={formData.nama_pengguna}
                onChange={handleChange}
                placeholder="Contoh: admin"
                autoComplete="username"
                required
              />
            </label>

            <label>
              <span>Kata sandi</span>
              <input
                type="password"
                name="kata_sandi"
                value={formData.kata_sandi}
                onChange={handleChange}
                placeholder="Masukkan kata sandi"
                autoComplete="current-password"
                required
              />
            </label>

            {error && <div className="error-box">{error}</div>}

            <button type="submit" className="primary-button large" disabled={isSubmitting}>
              {isSubmitting ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
