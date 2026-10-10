const API_BASE_URL = 'http://localhost:5001/api'

async function request(path, token, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  let result
  try {
    result = await response.json()
  } catch {
    throw new Error('Server mengirim respons yang tidak dapat dibaca.')
  }

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Permintaan tidak dapat diproses.')
  }

  return result.data
}

export function getEmployeeSchedules(token, mulai, selesai) {
  const query = new URLSearchParams()
  if (mulai) query.set('mulai', mulai)
  if (selesai) query.set('selesai', selesai)
  return request(`/karyawan/jadwal${query.size ? `?${query}` : ''}`, token)
}

export function getActiveShifts(token) {
  return request('/karyawan/shift', token)
}

export function getAttendanceHistory(token, mulai, selesai) {
  const query = new URLSearchParams()
  if (mulai) query.set('mulai', mulai)
  if (selesai) query.set('selesai', selesai)
  return request(`/karyawan/absensi${query.size ? `?${query}` : ''}`, token)
}

export function submitAttendance(token, action, payload) {
  return request(`/karyawan/absensi/${action}`, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getLeaveRequests(token) {
  return request('/karyawan/pengajuan-izin', token)
}

export function createLeaveRequest(token, payload) {
  return request('/karyawan/pengajuan-izin', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getScheduleChangeRequests(token) {
  return request('/karyawan/perubahan-jadwal', token)
}

export function createScheduleChangeRequest(token, payload) {
  return request('/karyawan/perubahan-jadwal', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getBranches() {
  return request('/cabang')
}
