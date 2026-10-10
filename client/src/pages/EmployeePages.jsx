import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/auth'
import {
  createLeaveRequest,
  createScheduleChangeRequest,
  getActiveShifts,
  getAttendanceHistory,
  getBranches,
  getEmployeeSchedules,
  getLeaveRequests,
  getScheduleChangeRequests,
  submitAttendance,
} from '../services/employeeApi'

const getJakartaDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
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
  : '—'

const toClock = (value) => value ? value.slice(0, 5) : '—'

function PageHeading({ eyebrow, title, detail }) {
  return (
    <div className="page-heading">
      <p className="section-kicker">{eyebrow}</p>
      <h3>{title}</h3>
      {detail && <p>{detail}</p>}
    </div>
  )
}

export function EmployeeSchedulePage() {
  const { token } = useAuth()
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getEmployeeSchedules(token)
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
      <PageHeading
        eyebrow="Jadwal"
        title="Jadwal kerja saya"
        detail="Jadwal ditampilkan dari penugasan database untuk akun karyawan yang sedang masuk."
      />

      <section className="panel-block">
        {loading && <p className="empty-state" role="status">Memuat jadwal kerja...</p>}
        {error && <p className="empty-state error" role="alert">{error}</p>}
        {!loading && !error && schedules.length === 0 && (
          <div className="empty-state">Belum ada jadwal kerja pada bulan ini.</div>
        )}
        {!loading && !error && schedules.length > 0 && (
          <div className="employee-record-list">
            {schedules.map((schedule) => (
              <article className="employee-record schedule-record" key={schedule.id_jadwal}>
                <div className="record-mark" aria-hidden="true">J</div>
                <div className="record-main">
                  <strong>{formatDate(schedule.tanggal_kerja)}</strong>
                  <span>{schedule.nama_shift || 'Shift belum ditentukan'} · {schedule.nama_cabang}</span>
                  {schedule.catatan && <small>{schedule.catatan}</small>}
                </div>
                <div className="record-side">
                  <span className="status-pill neutral">{schedule.status_jadwal}</span>
                  <span className="record-time">
                    {schedule.jam_masuk && schedule.jam_pulang
                      ? `${toClock(schedule.jam_masuk)} – ${toClock(schedule.jam_pulang)}`
                      : 'Jam belum ditentukan'}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export function AttendanceHistoryPage() {
  const { token } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getAttendanceHistory(token)
      .then((rows) => {
        if (active) setRecords(rows)
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
      <PageHeading
        eyebrow="Riwayat"
        title="Riwayat absensi"
        detail="Hanya catatan absensi yang benar-benar tersimpan yang ditampilkan. Tidak ada status alfa yang disimpulkan."
      />

      <section className="panel-block">
        {loading && <p className="empty-state" role="status">Memuat riwayat absensi...</p>}
        {error && <p className="empty-state error" role="alert">{error}</p>}
        {!loading && !error && records.length === 0 && (
          <div className="empty-state">Belum ada catatan absensi pada bulan ini.</div>
        )}
        {!loading && !error && records.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Cabang / shift</th>
                  <th>Masuk</th>
                  <th>Pulang</th>
                  <th>Status tercatat</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id_absensi}>
                    <td>{formatDate(record.tanggal_kerja)}</td>
                    <td>{record.nama_cabang}<small>{record.nama_shift || 'Shift belum ditentukan'}</small></td>
                    <td>{formatDateTime(record.waktu_masuk)}</td>
                    <td>{formatDateTime(record.waktu_pulang)}</td>
                    <td><span className="status-pill neutral">{record.status_kehadiran}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

const getBrowserCoordinates = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('Perangkat ini tidak menyediakan layanan lokasi.'))
    return
  }

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => resolve({
      latitude: coords.latitude,
      longitude: coords.longitude,
    }),
    () => reject(new Error('Lokasi tidak dapat diakses. Izinkan akses lokasi lalu coba lagi.')),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  )
})

export function AttendancePage() {
  const { token } = useAuth()
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [busySchedule, setBusySchedule] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    const today = getJakartaDate()

    getEmployeeSchedules(token, today, today)
      .then((rows) => {
        if (!active) return
        setSchedules(rows)
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

  const handleAttendance = async (schedule, action) => {
    setBusySchedule(String(schedule.id_jadwal))
    setError('')
    setFeedback('')

    try {
      const coordinates = await getBrowserCoordinates()
      const saved = await submitAttendance(token, action, {
        id_jadwal: schedule.id_jadwal,
        ...coordinates,
      })
      setFeedback(action === 'masuk'
        ? `Absensi masuk tercatat pada ${formatDateTime(saved.waktu_masuk)}.`
        : `Absensi pulang tercatat pada ${formatDateTime(saved.waktu_pulang)}.`)
      setRefresh((value) => value + 1)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusySchedule('')
    }
  }

  return (
    <div className="dashboard-stack">
      <PageHeading
        eyebrow="Kehadiran"
        title="Absensi masuk dan pulang"
        detail="Lokasi divalidasi di backend terhadap cabang pada jadwal Anda. Catatan hanya dianggap berhasil setelah tersimpan di database."
      />

      {feedback && <p className="success-box" role="status">{feedback}</p>}
      {error && <p className="error-box" role="alert">{error}</p>}

      <section className="panel-block">
        {loading && <p className="empty-state" role="status">Memuat jadwal hari ini...</p>}
        {!loading && !error && schedules.length === 0 && (
          <div className="empty-state">
            Tidak ada jadwal kerja yang tercatat untuk hari ini. Absensi tidak dapat dilakukan dan status alfa tidak disimpulkan.
            <Link to="/karyawan/jadwal" className="text-link">Lihat jadwal</Link>
          </div>
        )}
        {!loading && schedules.map((schedule) => {
          const hasAttendance = Boolean(schedule.id_absensi)
          const canClockIn = schedule.status_jadwal === 'terjadwal'
            && schedule.id_shift
            && schedule.lokasi_absensi_tersedia
            && !hasAttendance
          const canClockOut = schedule.status_jadwal === 'terjadwal'
            && schedule.id_shift
            && schedule.lokasi_absensi_tersedia
            && hasAttendance
            && !schedule.waktu_pulang

          return (
            <article className="attendance-card" key={schedule.id_jadwal}>
              <div className="attendance-card-header">
                <div>
                  <p className="section-kicker">{schedule.nama_cabang}</p>
                  <h4>{schedule.nama_shift || 'Shift belum ditentukan'}</h4>
                </div>
                <span className="status-pill neutral">{schedule.status_jadwal}</span>
              </div>
              <p className="attendance-schedule">
                {schedule.jam_masuk && schedule.jam_pulang
                  ? `${toClock(schedule.jam_masuk)} – ${toClock(schedule.jam_pulang)} WIB`
                  : 'Waktu shift belum ditentukan'}
              </p>
              {hasAttendance && (
                <div className="attendance-times">
                  <span>Masuk <strong>{formatDateTime(schedule.waktu_masuk)}</strong></span>
                  <span>Pulang <strong>{formatDateTime(schedule.waktu_pulang)}</strong></span>
                </div>
              )}
              {schedule.status_jadwal !== 'terjadwal' && (
                <p className="helper-text">Absensi hanya tersedia pada jadwal berstatus terjadwal.</p>
              )}
              {!schedule.id_shift && (
                <p className="helper-text">Absensi belum tersedia karena shift belum ditentukan pada jadwal.</p>
              )}
              {schedule.id_shift && !schedule.lokasi_absensi_tersedia && (
                <p className="helper-text">Absensi belum tersedia karena koordinat lokasi cabang belum dikonfigurasi.</p>
              )}
              <div className="attendance-actions">
                <button
                  type="button"
                  className="primary-button"
                  disabled={!canClockIn || busySchedule === String(schedule.id_jadwal)}
                  onClick={() => handleAttendance(schedule, 'masuk')}
                >
                  {busySchedule === String(schedule.id_jadwal) ? 'Memproses...' : 'Absen masuk'}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={!canClockOut || busySchedule === String(schedule.id_jadwal)}
                  onClick={() => handleAttendance(schedule, 'pulang')}
                >
                  Absen pulang
                </button>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}

const requestStatusLabels = {
  menunggu: 'Menunggu',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
}

function RequestList({ title, requests, emptyText, requestType }) {
  return (
    <section className="panel-block">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Riwayat</p>
          <h3>{title}</h3>
        </div>
      </div>
      {requests.length === 0 && <p className="empty-state">{emptyText}</p>}
      {requests.length > 0 && (
        <div className="employee-record-list">
          {requests.map((request) => {
            const id = requestType === 'leave'
              ? request.id_pengajuan
              : request.id_pengajuan_perubahan
            const dates = requestType === 'leave'
              ? `${formatDate(request.tanggal_mulai)} – ${formatDate(request.tanggal_selesai)}`
              : formatDate(request.tanggal_jadwal_baru)
            const category = requestType === 'leave'
              ? request.jenis_pengajuan
              : request.jenis_perubahan

            return (
              <article className="employee-record" key={id}>
                <div className="record-mark" aria-hidden="true">P</div>
                <div className="record-main">
                  <strong>{category} · {dates}</strong>
                  <span>{request.alasan}</span>
                  {request.catatan_admin && <small>Catatan: {request.catatan_admin}</small>}
                </div>
                <span className={`status-pill ${request.status_pengajuan === 'menunggu' ? 'warning' : 'neutral'}`}>
                  {requestStatusLabels[request.status_pengajuan] || request.status_pengajuan}
                </span>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export function EmployeeRequestsPage() {
  const { token } = useAuth()
  const [leaveForm, setLeaveForm] = useState({
    tanggal_mulai: getJakartaDate(),
    tanggal_selesai: getJakartaDate(),
    jenis_pengajuan: 'izin',
    alasan: '',
  })
  const [changeForm, setChangeForm] = useState({
    id_jadwal_asal: '',
    id_cabang_tujuan: '',
    tanggal_jadwal_baru: getJakartaDate(),
    id_shift_baru: '',
    jenis_perubahan: 'ubah_jadwal',
    alasan: '',
  })
  const [leaveRequests, setLeaveRequests] = useState([])
  const [changeRequests, setChangeRequests] = useState([])
  const [schedules, setSchedules] = useState([])
  const [branches, setBranches] = useState([])
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true

    Promise.all([
      getLeaveRequests(token),
      getScheduleChangeRequests(token),
      getEmployeeSchedules(token),
      getBranches(),
      getActiveShifts(token),
    ])
      .then(([leaveRows, changeRows, scheduleRows, branchRows, shiftRows]) => {
        if (!active) return
        setLeaveRequests(leaveRows)
        setChangeRequests(changeRows)
        setSchedules(scheduleRows)
        setBranches(branchRows)
        setShifts(shiftRows)
        setLoadError('')
      })
      .catch((requestError) => {
        if (active) setLoadError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [token, refresh])

  const updateLeave = (event) => {
    const { name, value } = event.target
    setLeaveForm((current) => ({ ...current, [name]: value }))
  }

  const updateChange = (event) => {
    const { name, value } = event.target
    setChangeForm((current) => ({ ...current, [name]: value }))
  }

  const submitLeave = async (event) => {
    event.preventDefault()
    setSubmitting('leave')
    setError('')
    setFeedback('')
    try {
      await createLeaveRequest(token, leaveForm)
      setLeaveForm((current) => ({ ...current, alasan: '' }))
      setFeedback('Pengajuan berhasil disimpan dan berstatus menunggu persetujuan.')
      setRefresh((value) => value + 1)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting('')
    }
  }

  const submitChange = async (event) => {
    event.preventDefault()
    setSubmitting('change')
    setError('')
    setFeedback('')
    try {
      const payload = {
        ...changeForm,
        id_jadwal_asal: changeForm.id_jadwal_asal || undefined,
        id_cabang_tujuan: changeForm.id_cabang_tujuan || undefined,
        id_shift_baru: changeForm.id_shift_baru || undefined,
      }
      await createScheduleChangeRequest(token, payload)
      setChangeForm((current) => ({ ...current, alasan: '' }))
      setFeedback('Permohonan perubahan jadwal berhasil disimpan dan berstatus menunggu persetujuan.')
      setRefresh((value) => value + 1)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting('')
    }
  }

  return (
    <div className="dashboard-stack">
      <PageHeading
        eyebrow="Pengajuan"
        title="Izin, sakit, dan perubahan jadwal"
        detail="Pengajuan dikaitkan dengan akun karyawan Anda dan disimpan dengan status menunggu; perubahan tidak berlaku sebelum diproses admin."
      />

      {feedback && <p className="success-box" role="status">{feedback}</p>}
      {error && <p className="error-box" role="alert">{error}</p>}
      {loadError && <p className="empty-state error" role="alert">{loadError}</p>}
      {loading && <p className="empty-state" role="status">Memuat pengajuan...</p>}

      <section className="request-form-grid">
        <form className="panel-block form-card" onSubmit={submitLeave}>
          <div className="panel-header">
            <div>
              <p className="section-kicker">Pengajuan baru</p>
              <h3>Izin atau sakit</h3>
            </div>
          </div>

          <div className="form-fields">
            <label>
              <span>Jenis pengajuan</span>
              <select name="jenis_pengajuan" value={leaveForm.jenis_pengajuan} onChange={updateLeave}>
                <option value="izin">Izin</option>
                <option value="sakit">Sakit</option>
              </select>
            </label>
            <div className="form-row">
              <label>
                <span>Tanggal mulai</span>
                <input type="date" name="tanggal_mulai" value={leaveForm.tanggal_mulai} onChange={updateLeave} required />
              </label>
              <label>
                <span>Tanggal selesai</span>
                <input type="date" name="tanggal_selesai" value={leaveForm.tanggal_selesai} onChange={updateLeave} required />
              </label>
            </div>
            <label>
              <span>Alasan</span>
              <textarea name="alasan" value={leaveForm.alasan} onChange={updateLeave} minLength="5" maxLength="2000" rows="3" required />
            </label>
            <button className="primary-button" type="submit" disabled={submitting !== ''}>
              {submitting === 'leave' ? 'Menyimpan...' : 'Kirim pengajuan'}
            </button>
          </div>
        </form>

        <form className="panel-block form-card" onSubmit={submitChange}>
          <div className="panel-header">
            <div>
              <p className="section-kicker">Permohonan baru</p>
              <h3>Perubahan jadwal</h3>
            </div>
          </div>

          <div className="form-fields">
            <label>
              <span>Jenis perubahan</span>
              <select name="jenis_perubahan" value={changeForm.jenis_perubahan} onChange={updateChange}>
                <option value="ubah_jadwal">Ubah jadwal</option>
                <option value="tukar_shift">Tukar shift</option>
                <option value="tukar_libur">Tukar libur</option>
                <option value="pindah_cabang">Pindah cabang</option>
              </select>
            </label>
            <label>
              <span>Tanggal jadwal baru</span>
              <input type="date" name="tanggal_jadwal_baru" value={changeForm.tanggal_jadwal_baru} onChange={updateChange} required />
            </label>
            <label>
              <span>Jadwal asal (opsional)</span>
              <select name="id_jadwal_asal" value={changeForm.id_jadwal_asal} onChange={updateChange}>
                <option value="">Tidak memilih jadwal asal</option>
                {schedules.map((schedule) => (
                  <option key={schedule.id_jadwal} value={schedule.id_jadwal}>
                    {formatDate(schedule.tanggal_kerja)} · {schedule.nama_shift || 'Tanpa shift'} · {schedule.nama_cabang}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                <span>Cabang tujuan (opsional)</span>
                <select name="id_cabang_tujuan" value={changeForm.id_cabang_tujuan} onChange={updateChange}>
                  <option value="">Tidak memilih cabang</option>
                  {branches.map((branch) => (
                    <option key={branch.id_cabang} value={branch.id_cabang}>{branch.nama_cabang}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Shift baru (opsional)</span>
                <select name="id_shift_baru" value={changeForm.id_shift_baru} onChange={updateChange}>
                  <option value="">Tidak memilih shift</option>
                  {shifts.map((shift) => (
                    <option key={shift.id_shift} value={shift.id_shift}>
                      {shift.nama_shift} · {toClock(shift.jam_masuk)}–{toClock(shift.jam_pulang)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              <span>Alasan</span>
              <textarea name="alasan" value={changeForm.alasan} onChange={updateChange} minLength="5" maxLength="2000" rows="3" required />
            </label>
            <button className="primary-button" type="submit" disabled={submitting !== ''}>
              {submitting === 'change' ? 'Menyimpan...' : 'Kirim permohonan'}
            </button>
          </div>
        </form>
      </section>

      {!loading && !loadError && (
        <section className="request-history-grid">
          <RequestList
            title="Pengajuan izin dan sakit"
            requests={leaveRequests}
            emptyText="Belum ada pengajuan izin atau sakit."
            requestType="leave"
          />
          <RequestList
            title="Perubahan jadwal"
            requests={changeRequests}
            emptyText="Belum ada permohonan perubahan jadwal."
            requestType="change"
          />
        </section>
      )}
    </div>
  )
}
