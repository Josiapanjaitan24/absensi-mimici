import { useEffect, useState } from 'react'
import { useAuth } from '../context/auth'
import {
  getAdminEmployeeRequests,
  updateAdminEmployeeRequest,
} from '../services/adminApi'

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(`${String(value).slice(0, 10)}T12:00:00+07:00`))
  : '—'

const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
  : '—'

const requestTypeLabel = (request, type) => type === 'leave'
  ? request.jenis_pengajuan === 'sakit' ? 'Sakit' : 'Izin'
  : ({
    tukar_shift: 'Tukar shift',
    tukar_libur: 'Tukar libur',
    pindah_cabang: 'Pindah cabang',
    ubah_jadwal: 'Ubah jadwal',
  }[request.jenis_perubahan] || request.jenis_perubahan)

function RequestCards({ title, requests, type, onView }) {
  return (
    <section className="panel-block">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Pengajuan masuk</p>
          <h3>{title}</h3>
        </div>
        <span className="badge-soft">{requests.length} pengajuan</span>
      </div>
      {requests.length === 0 && <p className="empty-state">Belum ada pengajuan.</p>}
      {requests.length > 0 && (
        <div className="employee-record-list">
          {requests.map((request) => {
            const isLeave = type === 'leave'
            const key = isLeave ? request.id_pengajuan : request.id_pengajuan_perubahan
            const period = isLeave
              ? `${formatDate(request.tanggal_mulai)} – ${formatDate(request.tanggal_selesai)}`
              : formatDate(request.tanggal_jadwal_baru)

            return (
              <article className="employee-record admin-request-card" key={key}>
                <div className="record-main">
                  <strong>{request.nama_lengkap} · {requestTypeLabel(request, type)}</strong>
                  <span>{period}</span>
                  {!isLeave && (
                    <small>
                      {request.nama_cabang_tujuan
                        ? `Cabang tujuan: ${request.nama_cabang_tujuan}`
                        : 'Cabang tujuan: Tidak ditentukan'}
                      {request.nama_shift_baru ? ` · Shift: ${request.nama_shift_baru}` : ''}
                    </small>
                  )}
                  <p className="admin-request-reason">{request.alasan}</p>
                  <small>Diajukan {formatDateTime(request.waktu_diajukan)}</small>
                </div>
                <div className="admin-request-actions">
                  <span className={`status-pill ${request.status_pengajuan === 'menunggu' ? 'warning' : 'neutral'}`}>
                    {request.status_pengajuan}
                  </span>
                  <button type="button" className="secondary-button" onClick={() => onView(request, type)}>
                    Lihat
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function DetailRow({ label, children }) {
  return (
    <div className="request-detail-row">
      <dt>{label}</dt>
      <dd>{children || '—'}</dd>
    </div>
  )
}

function RequestDetailDialog({ request, type, onClose, onDecision, busy, error }) {
  const isLeave = type === 'leave'
  const isPending = request.status_pengajuan === 'menunggu'
  const requestId = isLeave ? request.id_pengajuan : request.id_pengajuan_perubahan
  const [adminNote, setAdminNote] = useState('')

  return (
    <div className="camera-backdrop request-dialog-backdrop" role="presentation">
      <section
        className="camera-dialog request-detail-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-detail-title"
      >
        <div className="camera-dialog-header">
          <div>
            <p className="section-kicker">{isLeave ? 'Izin dan sakit' : 'Perubahan jadwal'}</p>
            <h3 id="request-detail-title">Detail pengajuan karyawan</h3>
          </div>
          <button type="button" className="ghost-button" onClick={onClose} disabled={busy}>
            Tutup
          </button>
        </div>

        <dl className="request-detail-list">
          <DetailRow label="Karyawan">{request.nama_lengkap}</DetailRow>
          <DetailRow label="Jenis pengajuan">{requestTypeLabel(request, type)}</DetailRow>
          {isLeave ? (
            <DetailRow label="Periode">
              {formatDate(request.tanggal_mulai)} – {formatDate(request.tanggal_selesai)}
            </DetailRow>
          ) : (
            <>
              <DetailRow label="Tanggal jadwal baru">{formatDate(request.tanggal_jadwal_baru)}</DetailRow>
              <DetailRow label="Jadwal asal">
                {request.tanggal_jadwal_asal
                  ? `${formatDate(request.tanggal_jadwal_asal)} · ${request.nama_shift_asal || 'Tanpa shift'} · ${request.nama_cabang_asal || 'Tanpa cabang'}`
                  : 'Tidak ditentukan'}
              </DetailRow>
              <DetailRow label="Cabang tujuan">{request.nama_cabang_tujuan}</DetailRow>
              <DetailRow label="Shift baru">{request.nama_shift_baru}</DetailRow>
            </>
          )}
          <DetailRow label="Alasan">{request.alasan}</DetailRow>
          <DetailRow label="Status">
            <span className={`status-pill ${request.status_pengajuan === 'menunggu' ? 'warning' : 'neutral'}`}>
              {request.status_pengajuan}
            </span>
          </DetailRow>
          <DetailRow label="Diajukan">{formatDateTime(request.waktu_diajukan)}</DetailRow>
          {request.waktu_diproses && (
            <DetailRow label="Diproses">{formatDateTime(request.waktu_diproses)}</DetailRow>
          )}
          {!isPending && <DetailRow label="Catatan admin">{request.catatan_admin}</DetailRow>}
        </dl>

        {isPending && (
          <form
            className="request-decision-form"
            onSubmit={(event) => {
              event.preventDefault()
              onDecision(requestId, type, 'disetujui', adminNote)
            }}
          >
            {!isLeave && (
              <p className="helper-text">
                Keputusan ini memperbarui status permohonan. Jadwal kerja tidak diubah otomatis.
              </p>
            )}
            <label className="request-note-field">
              <span>Catatan admin <small>(opsional)</small></span>
              <textarea
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                maxLength={2000}
                rows={3}
                disabled={busy}
              />
            </label>
            {error && <p className="error-box" role="alert">{error}</p>}
            <div className="request-decision-actions">
              <button
                type="button"
                className="secondary-button request-decision-reject"
                disabled={busy}
                onClick={() => onDecision(requestId, type, 'ditolak', adminNote)}
              >
                {busy ? 'Memproses...' : 'Tolak pengajuan'}
              </button>
              <button type="submit" className="primary-button" disabled={busy}>
                {busy ? 'Memproses...' : 'Setujui pengajuan'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}

export function AdminRequestsPage() {
  const { token } = useAuth()
  const [requests, setRequests] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [decisionError, setDecisionError] = useState('')
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    let active = true
    getAdminEmployeeRequests(token)
      .then((result) => {
        if (!active) return
        setRequests(result)
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
  }, [token, refresh])

  const processRequest = async (id, type, status_pengajuan, catatan_admin) => {
    setProcessing(true)
    setDecisionError('')
    setFeedback('')
    try {
      await updateAdminEmployeeRequest(token, type === 'leave' ? 'izin' : 'perubahan-jadwal', id, {
        status_pengajuan,
        catatan_admin,
      })
      setSelectedRequest(null)
      setFeedback(status_pengajuan === 'disetujui'
        ? 'Pengajuan berhasil disetujui.'
        : 'Pengajuan berhasil ditolak.')
      setLoading(true)
      setRefresh((value) => value + 1)
    } catch (requestError) {
      setDecisionError(requestError.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="dashboard-stack">
      <div className="page-heading">
        <p className="section-kicker">Administrasi karyawan</p>
        <h3>Pengajuan karyawan</h3>
        <p>Lihat rincian pengajuan izin, sakit, dan perubahan jadwal, lalu setujui atau tolak permintaan yang masih menunggu.</p>
      </div>
      {feedback && <p className="success-box" role="status">{feedback}</p>}
      {loading && <p className="empty-state" role="status">Memuat pengajuan karyawan...</p>}
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
      {!loading && !error && requests && (
        <>
          <RequestCards
            title="Izin dan sakit"
            requests={requests.izin}
            type="leave"
            onView={(request, type) => {
              setDecisionError('')
              setSelectedRequest({ request, type })
            }}
          />
          <RequestCards
            title="Perubahan jadwal"
            requests={requests.perubahan_jadwal}
            type="schedule"
            onView={(request, type) => {
              setDecisionError('')
              setSelectedRequest({ request, type })
            }}
          />
        </>
      )}
      {selectedRequest && (
        <RequestDetailDialog
          request={selectedRequest.request}
          type={selectedRequest.type}
          onClose={() => setSelectedRequest(null)}
          onDecision={processRequest}
          busy={processing}
          error={decisionError}
        />
      )}
    </div>
  )
}
