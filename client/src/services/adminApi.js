import { API_BASE_URL } from './apiConfig'

async function request(path, token, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
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
    throw new Error(result.message || 'Permintaan admin tidak dapat diproses.')
  }

  return result.data
}

export function getAdminDashboard(token) {
  return request('/admin/dashboard', token)
}

export function getAdminBranches(token) {
  return request('/admin/cabang', token)
}

export function getAdminEmployeeRequests(token) {
  return request('/admin/pengajuan', token)
}

export function updateAdminEmployeeRequest(token, type, id, decision) {
  return request(`/admin/pengajuan/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, token, {
    method: 'PATCH',
    body: JSON.stringify(decision),
  })
}

export function updateAdminBranch(token, id, changes) {
  return request(`/admin/cabang/${encodeURIComponent(id)}`, token, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  })
}

const buildMonthlyReportQuery = ({ month, branchId }) => {
  const [year, selectedMonth] = month.split('-')
  const query = new URLSearchParams({
    bulan: String(Number(selectedMonth)),
    tahun: year,
  })
  if (branchId) query.set('id_cabang', branchId)
  return query.toString()
}

export function getMonthlyReportPreview(token, filters) {
  return request(`/admin/rekap-bulanan?${buildMonthlyReportQuery(filters)}`, token)
}

export async function downloadMonthlyReport(token, filters) {
  const response = await fetch(
    `${API_BASE_URL}/admin/rekap-bulanan.xlsx?${buildMonthlyReportQuery(filters)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!response.ok) {
    let message = 'File rekap tidak dapat diunduh.'
    try {
      const result = await response.json()
      message = result.message || message
    } catch {
      // Keep the safe generic message when the response is not JSON.
    }
    throw new Error(message)
  }

  return response.blob()
}
