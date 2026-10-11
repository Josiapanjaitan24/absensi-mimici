import { useEffect, useState } from 'react'
import { useAuth } from '../context/auth'
import { getAdminBranches, updateAdminBranch } from '../services/adminApi'

export function AdminBranches() {
  const { token } = useAuth()
  const [branches, setBranches] = useState([])
  const [radiusDrafts, setRadiusDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [busyId, setBusyId] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true

    getAdminBranches(token)
      .then((rows) => {
        if (!active) return
        setBranches(rows)
        setRadiusDrafts(Object.fromEntries(
          rows.map((branch) => [branch.id_cabang, String(branch.radius_meter ?? '')])
        ))
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

  const applyUpdate = async (branch, changes, action) => {
    const id = String(branch.id_cabang)
    setBusyId(id)
    setError('')
    setFeedback('')

    try {
      const updated = await updateAdminBranch(token, id, changes)
      setBranches((current) => current.map((item) => (
        item.id_cabang === updated.id_cabang ? updated : item
      )))
      setRadiusDrafts((current) => ({
        ...current,
        [updated.id_cabang]: String(updated.radius_meter ?? ''),
      }))
      setFeedback(`${updated.nama_cabang}: ${action}`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyId('')
    }
  }

  const saveRadius = (event, branch) => {
    event.preventDefault()
    const radius = Number(radiusDrafts[branch.id_cabang])

    if (!Number.isSafeInteger(radius) || radius <= 0 || radius > 100) {
      setError('Radius GPS harus berupa bilangan bulat antara 1 dan 100 meter.')
      setFeedback('')
      return
    }

    applyUpdate(branch, { radius_meter: radius }, 'radius GPS diperbarui.')
  }

  return (
    <div className="dashboard-stack">
      <div className="page-heading">
        <p className="section-kicker">Pengaturan operasional</p>
        <h3>Pengelolaan cabang</h3>
        <p>Atur status cabang dan radius absensi (maksimal 100 meter). Koordinat GPS tidak diubah dari halaman ini.</p>
      </div>

      <section className="panel-block">
        <div className="panel-header">
          <div>
            <p className="section-kicker">Data cabang</p>
            <h3>Daftar cabang</h3>
          </div>
          <div className="admin-branch-tools">
            {!loading && !error && <span className="badge-soft">{branches.length} cabang</span>}
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
              Perbarui
            </button>
          </div>
        </div>

        {loading && <p className="empty-state" role="status">Memuat data cabang...</p>}
        {error && <p className="empty-state error" role="alert">{error}</p>}
        {feedback && <p className="success-box" role="status">{feedback}</p>}
        {!loading && !error && branches.length === 0 && (
          <p className="empty-state">Belum ada data cabang.</p>
        )}

        {!loading && !error && branches.length > 0 && (
          <div className="table-wrap">
            <table className="data-table admin-branch-table mobile-card-table">
              <thead>
                <tr>
                  <th>Nama cabang</th>
                  <th>Slug</th>
                  <th>Radius GPS</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => {
                  const isBusy = busyId === String(branch.id_cabang)
                  return (
                    <tr key={branch.id_cabang}>
                      <td data-label="Nama cabang">{branch.nama_cabang}</td>
                      <td data-label="Slug">{branch.slug || '—'}</td>
                      <td data-label="Radius GPS">
                        <form
                          className="admin-radius-form"
                          onSubmit={(event) => saveRadius(event, branch)}
                        >
                          <label className="sr-only" htmlFor={`radius-${branch.id_cabang}`}>
                            Radius GPS {branch.nama_cabang} dalam meter
                          </label>
                          <input
                            id={`radius-${branch.id_cabang}`}
                            type="number"
                            min="1"
                            max="100"
                            step="1"
                            inputMode="numeric"
                            value={radiusDrafts[branch.id_cabang] ?? ''}
                            onChange={(event) => setRadiusDrafts((current) => ({
                              ...current,
                              [branch.id_cabang]: event.target.value,
                            }))}
                            required
                          />
                          <button type="submit" className="secondary-button" disabled={isBusy}>
                            Simpan
                          </button>
                        </form>
                      </td>
                      <td data-label="Status">
                        <span className={`status-pill ${branch.status_aktif ? 'success' : 'neutral'}`}>
                          {branch.status_aktif ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td data-label="Aksi">
                        <button
                          type="button"
                          className="ghost-button"
                          disabled={isBusy}
                          onClick={() => {
                            const nextStatus = !branch.status_aktif
                            const action = nextStatus ? 'mengaktifkan' : 'menonaktifkan'
                            if (!window.confirm(`Yakin ingin ${action} cabang ${branch.nama_cabang}?`)) return
                            applyUpdate(
                              branch,
                              { status_aktif: nextStatus },
                              nextStatus ? 'diaktifkan.' : 'dinonaktifkan.'
                            )
                          }}
                        >
                          {branch.status_aktif ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
