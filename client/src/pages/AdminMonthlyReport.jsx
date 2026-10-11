import { useEffect, useState } from 'react'
import { useAuth } from '../context/auth'
import {
  downloadMonthlyReport,
  getMonthlyReportPreview,
} from '../services/adminApi'

const getCurrentMonth = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
}).format(new Date())

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(`${value}T12:00:00+07:00`))
  : '—'

const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
  : 'Belum tercatat'

export function AdminMonthlyReport() {
  const { token } = useAuth()
  const [month, setMonth] = useState(getCurrentMonth)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [downloadMessage, setDownloadMessage] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    const [year, selectedMonth] = month.split('-')

    getMonthlyReportPreview(token, { month })
      .then((result) => {
        if (!active) return
        setReport({
          ...result,
          periode: { ...result.periode, tahun: Number(year), bulan: Number(selectedMonth) },
        })
      })
      .catch((requestError) => {
        if (!active) return
        setReport(null)
        setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [token, month, retry])

  const download = async () => {
    if (!report?.jumlah) return
    setDownloading(true)
    setError('')
    setDownloadMessage('')

    try {
      const blob = await downloadMonthlyReport(token, { month })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `Rekap_Absensi_${month}.xlsx`
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      setDownloadMessage('File Excel berhasil diunduh.')
    } catch (downloadError) {
      setError(downloadError.message)
    } finally {
      setDownloading(false)
    }
  }

  const visibleRows = report?.data ?? []

  return (
    <div className="dashboard-stack">
      <div className="page-heading">
        <p className="section-kicker">Pelaporan</p>
        <h3>Rekap bulanan absensi</h3>
        <p>Rekap mencakup seluruh cabang dalam satu pratinjau dan satu file, termasuk absensi tersimpan serta pengajuan izin/sakit yang disetujui.</p>
      </div>

      <section className="panel-block">
        <div className="report-filters">
          <label className="report-filter">
            <span>Periode bulan</span>
            <input
              type="month"
              value={month}
              onChange={(event) => {
                setLoading(true)
                setError('')
                setMonth(event.target.value)
              }}
              required
            />
          </label>
          <button
            type="button"
            className="primary-button report-download-button"
            onClick={download}
            disabled={loading || downloading || !report?.jumlah}
            title={!report?.jumlah ? 'Tidak ada data untuk diunduh pada filter ini' : undefined}
          >
            {downloading ? 'Menyiapkan file...' : 'Unduh Rekap Bulanan Excel'}
          </button>
        </div>
        <p className="helper-text">File Excel dibuat oleh backend dari database dan hanya dapat diakses admin.</p>
      </section>

      {error && (
        <div className="error-box" role="alert">
          <span>{error}</span>
          <button type="button" className="text-button" onClick={() => {
            setLoading(true)
            setError('')
            setRetry((value) => value + 1)
          }}>
            Coba lagi
          </button>
        </div>
      )}
      {downloadMessage && <p className="success-box" role="status">{downloadMessage}</p>}

      <section className="panel-block">
        <div className="panel-header">
          <div>
            <p className="section-kicker">Pratinjau</p>
            <h3>Data absensi</h3>
          </div>
          {!loading && !error && report && (
            <span className="badge-soft">{report.jumlah.toLocaleString('id-ID')} catatan</span>
          )}
        </div>

        {loading && <p className="empty-state" role="status">Memuat pratinjau rekap...</p>}
        {!loading && !error && report?.jumlah === 0 && (
          <p className="empty-state">Tidak ada data absensi untuk periode yang dipilih. File Excel tidak dibuat.</p>
        )}
        {!loading && !error && visibleRows.length > 0 && (
          <>
            {report.jumlah > visibleRows.length && (
              <p className="helper-text">
                Menampilkan {visibleRows.length} dari {report.jumlah.toLocaleString('id-ID')} catatan. File Excel mencakup seluruh cabang.
              </p>
            )}
            <div className="table-wrap">
              <table className="data-table mobile-card-table report-table">
                <thead>
                  <tr>
                    <th>Karyawan</th>
                    <th>Cabang</th>
                    <th>Tanggal kerja</th>
                    <th>Shift</th>
                    <th>Masuk</th>
                    <th>Pulang</th>
                    <th>Status</th>
                    <th>Terlambat</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, index) => (
                    <tr key={`${row.id_karyawan}-${row.tanggal_kerja}-${index}`}>
                      <td data-label="Karyawan">
                        {row.nama_lengkap}
                        <small>{row.kode_karyawan || `ID ${row.id_karyawan}`}</small>
                      </td>
                      <td data-label="Cabang">{row.nama_cabang}</td>
                      <td data-label="Tanggal kerja">{formatDate(row.tanggal_kerja)}</td>
                      <td data-label="Shift">
                        {row.nama_shift || '—'}
                        {row.jam_masuk_terjadwal && row.jam_pulang_terjadwal
                          && <small>{row.jam_masuk_terjadwal.slice(0, 5)}–{row.jam_pulang_terjadwal.slice(0, 5)}</small>}
                      </td>
                      <td data-label="Masuk">{formatDateTime(row.waktu_masuk)}</td>
                      <td data-label="Pulang">{formatDateTime(row.waktu_pulang)}</td>
                      <td data-label="Status">{row.status_kehadiran}</td>
                      <td data-label="Terlambat">{row.menit_terlambat} menit ({row.menit_terlambat_diluar_toleransi} di luar toleransi)</td>
                      <td data-label="Keterangan">{row.keterangan || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
