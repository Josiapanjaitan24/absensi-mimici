import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/auth'
import {
  createLeaveRequest,
  createScheduleChangeRequest,
  getActiveShifts,
  getAttendanceHistory,
  getBranchAttendanceStatus,
  getBranches,
  getEmployeeSchedules,
  getLeaveRequests,
  getScheduleChangeRequests,
  submitBranchAttendance,
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
  }).format(new Date(`${String(value).slice(0, 10)}T12:00:00+07:00`))
  : '—'

const formatDateTime = (value) => value
  ? /^\d{2}:\d{2}/.test(String(value))
    ? `${String(value).slice(0, 5)} WIB`
    : new Intl.DateTimeFormat('id-ID', {
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

export function AttendanceHistoryPage() {
  const { token } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

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
  }, [token, refresh])

  return (
    <div className="dashboard-stack">
      <PageHeading
        eyebrow="Riwayat"
        title="Riwayat absensi"
        detail="Hanya catatan absensi yang benar-benar tersimpan yang ditampilkan. Tidak ada status alfa yang disimpulkan."
      />

      <section className="panel-block">
        {loading && <p className="empty-state" role="status">Memuat riwayat absensi...</p>}
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
        {!loading && !error && records.length === 0 && (
          <div className="empty-state">Belum ada catatan absensi pada bulan ini.</div>
        )}
        {!loading && !error && records.length > 0 && (
          <div className="table-wrap">
            <table className="data-table mobile-card-table">
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
                    <td data-label="Tanggal">{formatDate(record.tanggal_kerja)}</td>
                    <td data-label="Cabang / shift">{record.nama_cabang}<small>{record.nama_shift || 'Shift belum ditentukan'}</small></td>
                    <td data-label="Masuk">{formatDateTime(record.waktu_masuk)}</td>
                    <td data-label="Pulang">{formatDateTime(record.waktu_pulang)}</td>
                    <td data-label="Status tercatat"><span className="status-pill neutral">{record.status_kehadiran}</span></td>
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
  const { branchSlug } = useParams()
  const { token } = useAuth()
  const [branches, setBranches] = useState([])
  const [branchesLoading, setBranchesLoading] = useState(true)
  const [branchError, setBranchError] = useState('')
  const [attendanceStatusState, setAttendanceStatusState] = useState({
    branchId: null,
    value: null,
    error: '',
  })
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [cameraState, setCameraState] = useState({ branchSlug: null, open: false })
  const [attendanceBusy, setAttendanceBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    getBranches()
      .then((branchRows) => {
        if (!active) return
        setBranches(branchRows)
        setBranchError('')
      })
      .catch((requestError) => {
        if (active) setBranchError(requestError.message)
      })
      .finally(() => {
        if (active) setBranchesLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const selectedDefinition = ATTENDANCE_BRANCHES.find((branch) => branch.slug === branchSlug)
  const findDatabaseBranch = (definition) => {
    if (!definition) return null
    const expected = normalizeBranchName(definition.name)
    return branches.find((branch) => {
      const actual = normalizeBranchName(branch.nama_cabang)
      return Boolean(actual) && (actual === expected || actual.includes(expected) || expected.includes(actual))
    }) || null
  }
  const selectedBranch = findDatabaseBranch(selectedDefinition)
  const branchId = selectedBranch ? String(selectedBranch.id_cabang) : null
  const branchStatusMatches = branchId !== null
    && String(attendanceStatusState.branchId) === branchId
  const attendanceStatus = branchStatusMatches ? attendanceStatusState.value : null
  const attendanceStatusError = branchStatusMatches ? attendanceStatusState.error : ''
  const statusLoading = Boolean(selectedBranch && !branchStatusMatches)
  const cameraOpen = cameraState.branchSlug === branchSlug
    ? cameraState.open
    : Boolean(branchSlug)

  useEffect(() => {
    let active = true
    if (!branchId) return undefined
    getBranchAttendanceStatus(token, branchId)
      .then((status) => {
        if (active) {
          setAttendanceStatusState({
            branchId,
            value: status,
            error: '',
          })
        }
      })
      .catch((requestError) => {
        if (active) {
          setAttendanceStatusState({
            branchId,
            value: null,
            error: requestError.message,
          })
        }
      })

    return () => {
      active = false
    }
  }, [token, branchId, refresh])

  const action = !attendanceStatus?.jam_masuk
    ? 'masuk'
    : attendanceStatus?.jam_pulang
      ? ''
      : 'pulang'

  const handleAttendance = async (photo) => {
    if (!selectedBranch || !photo || !action) return false
    setAttendanceBusy(true)
    setError('')
    setFeedback('')

    try {
      const coordinates = await getBrowserCoordinates()
      const saved = await submitBranchAttendance(token, {
        id_cabang: selectedBranch.id_cabang,
        ...coordinates,
      })
      setAttendanceStatusState({
        branchId: String(selectedBranch.id_cabang),
        value: {
          ...attendanceStatus,
          id_absensi: saved.id_absensi,
          jam_masuk: saved.jam_masuk,
          jam_pulang: saved.jam_pulang,
          status_absensi: saved.status_absensi,
        },
        error: '',
      })
      setFeedback(action === 'masuk'
        ? `Absen masuk berhasil. Lokasi terverifikasi ${saved.distance_meter} meter dari ${saved.nama_cabang}.`
        : `Absen pulang berhasil. Lokasi terverifikasi ${saved.distance_meter} meter dari ${saved.nama_cabang}.`)
      setCameraState({ branchSlug, open: false })
      setRefresh((value) => value + 1)
      return true
    } catch (requestError) {
      setError(requestError.message)
      return false
    } finally {
      setAttendanceBusy(false)
    }
  }

  if (!branchSlug) {
    return (
      <div className="dashboard-stack">
        <PageHeading
          eyebrow="Kehadiran"
          title="Pilih cabang absensi"
          detail="Pilih cabang tempat Anda bekerja. Kamera akan terbuka, lalu lokasi diverifikasi setelah foto diambil."
        />
        {branchesLoading && <p className="empty-state" role="status">Memuat daftar cabang...</p>}
        {branchError && <p className="error-box" role="alert">{branchError}</p>}
        {!branchesLoading && !branchError && (
          <section className="attendance-branch-grid" aria-label="Pilih cabang">
            {ATTENDANCE_BRANCHES.map((definition) => {
              const branch = findDatabaseBranch(definition)
              const href = `/absensi/${definition.slug}`

              return (
                <article className="attendance-branch-card" key={definition.slug}>
                  <Link to={href} className="attendance-branch-select">
                    <span className="attendance-branch-mark" aria-hidden="true">{definition.name.slice(0, 1)}</span>
                    <span className="attendance-branch-copy">
                      <strong>{definition.name}</strong>
                      <small>{branch
                        ? branch.status_aktif ? 'Pilih untuk membuka kamera' : 'Cabang sedang tidak aktif'
                        : 'Cabang belum tersedia di database'}</small>
                    </span>
                    <span className="shortcut-arrow" aria-hidden="true">→</span>
                  </Link>
                  <a href={definition.mapUrl} target="_blank" rel="noreferrer" className="text-link">
                    Lihat lokasi
                  </a>
                </article>
              )
            })}
          </section>
        )}
      </div>
    )
  }

  if (!selectedDefinition) {
    return (
      <div className="dashboard-stack">
        <p className="error-box" role="alert">Cabang absensi tidak ditemukan.</p>
        <Link to="/absensi" className="text-link">Kembali ke pilihan cabang</Link>
      </div>
    )
  }

  const displayTime = (value) => value
    ? /^\d{2}:\d{2}/.test(value) ? `${value.slice(0, 5)} WIB` : formatDateTime(value)
    : 'Belum tercatat'

  return (
    <div className="dashboard-stack">
      <div className="attendance-detail-heading">
        <Link to="/absensi" className="text-link">← Semua cabang</Link>
        <PageHeading
          eyebrow="Kehadiran"
          title={`Absensi ${selectedDefinition.name}`}
          detail="Ambil foto. Setelah itu lokasi perangkat diperiksa oleh server; jarak sampai dengan 100 meter diterima."
        />
        <a href={selectedDefinition.mapUrl} target="_blank" rel="noreferrer" className="text-link">
          Buka lokasi di peta
        </a>
      </div>

      {feedback && <p className="success-box" role="status">{feedback}</p>}
      {(branchError || attendanceStatusError || error) && (
        <div className="error-box" role="alert">
          <span>{branchError || attendanceStatusError || error}</span>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              if (!selectedBranch) {
                setBranchesLoading(true)
                setBranchError('')
                getBranches()
                  .then(setBranches)
                  .catch((requestError) => setBranchError(requestError.message))
                  .finally(() => setBranchesLoading(false))
                return
              }
              setError('')
              setRefresh((value) => value + 1)
            }}
          >
            Muat ulang
          </button>
        </div>
      )}

      <section className="panel-block">
        {(branchesLoading || statusLoading) && <p className="empty-state" role="status">Memuat status cabang dan absensi...</p>}
        {!branchesLoading && !branchError && !selectedBranch && (
          <p className="empty-state">
            Cabang ini belum terdaftar di database. Hubungi admin agar cabang dan koordinatnya diverifikasi.
          </p>
        )}
        {!branchesLoading && selectedBranch && (
          <article className="attendance-card">
              <div className="attendance-card-header">
                <div>
                  <p className="section-kicker">{selectedBranch.nama_cabang}</p>
                  <h4>{attendanceStatus?.tanggal ? formatDate(attendanceStatus.tanggal) : formatDate(getJakartaDate())}</h4>
                </div>
                <span className={`status-pill ${attendanceStatus?.jam_pulang ? 'success' : 'neutral'}`}>
                  {attendanceStatus?.jam_pulang ? 'Selesai' : attendanceStatus?.jam_masuk ? 'Sudah masuk' : 'Belum absen'}
                </span>
              </div>
              <div className="attendance-times">
                <span>Masuk <strong>{displayTime(attendanceStatus?.jam_masuk)}</strong></span>
                <span>Pulang <strong>{displayTime(attendanceStatus?.jam_pulang)}</strong></span>
              </div>
              {!selectedBranch.status_aktif && (
                <p className="error-box" role="alert">Cabang sedang tidak aktif untuk absensi.</p>
              )}
              {selectedBranch.latitude == null || selectedBranch.longitude == null ? (
                <p className="error-box" role="alert">Koordinat cabang belum dikonfigurasi. Absensi tidak dapat diproses.</p>
              ) : attendanceStatus?.jam_pulang ? (
                <p className="success-box" role="status">Absen masuk dan pulang untuk cabang ini sudah tercatat hari ini.</p>
              ) : !statusLoading && !error && (
                <div className="attendance-actions">
                  <button
                    type="button"
                    className="primary-button"
                    disabled={!selectedBranch.status_aktif || attendanceBusy || statusLoading}
                    onClick={() => setCameraState({ branchSlug, open: true })}
                  >
                    {attendanceBusy ? 'Memverifikasi lokasi...' : `Buka kamera untuk absen ${action}`}
                  </button>
                </div>
              )}
          </article>
        )}
      </section>
      {cameraOpen && selectedBranch?.status_aktif
        && selectedBranch.latitude != null && selectedBranch.longitude != null
        && action && !statusLoading && !branchesLoading && !error && !attendanceBusy && (
        <AttendanceCamera
          key={`${selectedBranch.id_cabang}-${action}`}
          action={action}
          onCancel={() => setCameraState({ branchSlug, open: false })}
          onCapture={handleAttendance}
        />
      )}
    </div>
  )
}

const ATTENDANCE_BRANCHES = [
  { slug: 'pakuan', name: 'Pakuan', mapUrl: 'https://maps.app.goo.gl/HgCfTyrxSviotwou8' },
  { slug: 'botani', name: 'Botani', mapUrl: 'https://maps.app.goo.gl/mBiNbWMu7fxWNsif6' },
  { slug: 'azimar', name: 'Azimar', mapUrl: 'https://maps.app.goo.gl/gmwLppkyDkjugBUC6' },
  { slug: 'ats', name: 'ATS', mapUrl: 'https://maps.app.goo.gl/kS4fAPy4QyKKYoQv8' },
  { slug: 'warung-nangka', name: 'Warung Nangka', mapUrl: 'https://maps.app.goo.gl/Yt1nwqQQDotoeMgYA' },
  { slug: 'ciapus', name: 'Ciapus', mapUrl: 'https://maps.app.goo.gl/SvwythN6nGaRYQj56' },
]

const normalizeBranchName = (name) => String(name || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '')

function AttendanceCamera({ action, onCancel, onCapture }) {
  const [stream, setStream] = useState(null)
  const [cameraError, setCameraError] = useState('')
  const [capturing, setCapturing] = useState(false)
  const [cameraAttempt, setCameraAttempt] = useState(0)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const cameraAvailable = Boolean(navigator.mediaDevices?.getUserMedia)
  const displayedCameraError = cameraError || (!cameraAvailable
    ? 'Kamera tidak tersedia. Gunakan browser dan koneksi aman (HTTPS) yang mendukung kamera.'
    : '')

  useEffect(() => {
    let active = true
    let cameraStream

    if (!cameraAvailable) return undefined

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((result) => {
        if (!active) {
          result.getTracks().forEach((track) => track.stop())
          return
        }
        cameraStream = result
        setStream(result)
        if (videoRef.current) {
          videoRef.current.srcObject = result
          videoRef.current.play().catch(() => {
            if (active) setCameraError('Pratinjau kamera tidak dapat dijalankan.')
          })
        }
      })
      .catch(() => {
        if (active) setCameraError('Kamera tidak dapat dibuka. Izinkan akses kamera lalu coba lagi.')
      })

    return () => {
      active = false
      cameraStream?.getTracks().forEach((track) => track.stop())
    }
  }, [cameraAvailable, cameraAttempt])

  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setCameraError('Kamera belum siap. Tunggu sebentar, lalu coba kembali.')
      return
    }

    setCapturing(true)
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob((photo) => {
      if (!photo) {
        setCapturing(false)
        setCameraError('Foto tidak dapat diambil. Coba kembali.')
        return
      }
      Promise.resolve(onCapture(photo))
        .then((saved) => {
          if (!saved) setCapturing(false)
        })
        .catch(() => {
          setCapturing(false)
          setCameraError('Absensi tidak dapat diproses. Periksa lokasi dan coba kembali.')
        })
    }, 'image/jpeg', 0.85)
  }

  return (
    <div className="camera-backdrop" role="presentation">
      <section className="camera-dialog" role="dialog" aria-modal="true" aria-labelledby="attendance-camera-title">
        <div className="camera-dialog-header">
          <div>
            <p className="section-kicker">Verifikasi kehadiran</p>
            <h3 id="attendance-camera-title">Foto sebelum absen {action}</h3>
          </div>
          <button type="button" className="ghost-button" onClick={onCancel} disabled={capturing}>Batal</button>
        </div>
        <video
          ref={videoRef}
          className="attendance-camera-video"
          autoPlay
          playsInline
          muted
          aria-label="Pratinjau kamera"
        />
        <canvas ref={canvasRef} className="sr-only" />
        <p className="helper-text">Foto hanya digunakan untuk membuka langkah kamera dan tidak dikirim atau disimpan. Lokasi akan diverifikasi oleh server setelah foto diambil.</p>
        {displayedCameraError && <p className="error-box" role="alert">{displayedCameraError}</p>}
        {displayedCameraError && cameraAvailable && (
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setCameraError('')
              setCameraAttempt((value) => value + 1)
            }}
          >
            Coba buka kamera lagi
          </button>
        )}
        <div className="attendance-actions">
          <button
            type="button"
            className="primary-button"
            onClick={capturePhoto}
            disabled={!stream || capturing || Boolean(displayedCameraError)}
          >
            {capturing ? 'Memverifikasi foto dan lokasi...' : 'Ambil foto'}
          </button>
        </div>
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
    if (leaveForm.tanggal_selesai < leaveForm.tanggal_mulai) {
      setError('Tanggal selesai tidak boleh sebelum tanggal mulai.')
      setFeedback('')
      return
    }
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
      {loadError && (
        <div className="error-box" role="alert">
          <span>{loadError}</span>
          <button type="button" className="text-button" onClick={() => {
            setLoading(true)
            setLoadError('')
            setRefresh((value) => value + 1)
          }}>
            Muat ulang data
          </button>
        </div>
      )}
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
              <span>Jenis pengajuan <span className="required-mark" aria-hidden="true">*</span></span>
              <select name="jenis_pengajuan" value={leaveForm.jenis_pengajuan} onChange={updateLeave} required>
                <option value="izin">Izin</option>
                <option value="sakit">Sakit</option>
              </select>
            </label>
            <div className="form-row">
              <label>
                <span>Tanggal mulai <span className="required-mark" aria-hidden="true">*</span></span>
                <input type="date" name="tanggal_mulai" value={leaveForm.tanggal_mulai} onChange={updateLeave} required />
              </label>
              <label>
                <span>Tanggal selesai <span className="required-mark" aria-hidden="true">*</span></span>
                <input type="date" name="tanggal_selesai" value={leaveForm.tanggal_selesai} onChange={updateLeave} required />
              </label>
            </div>
            <label>
              <span>Alasan <span className="required-mark" aria-hidden="true">*</span></span>
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
              <span>Jenis perubahan <span className="required-mark" aria-hidden="true">*</span></span>
              <select name="jenis_perubahan" value={changeForm.jenis_perubahan} onChange={updateChange} required>
                <option value="ubah_jadwal">Ubah jadwal</option>
                <option value="tukar_shift">Tukar shift</option>
                <option value="tukar_libur">Tukar libur</option>
                <option value="pindah_cabang">Pindah cabang</option>
              </select>
            </label>
            <label>
              <span>Tanggal jadwal baru <span className="required-mark" aria-hidden="true">*</span></span>
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
              <span>Alasan <span className="required-mark" aria-hidden="true">*</span></span>
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
