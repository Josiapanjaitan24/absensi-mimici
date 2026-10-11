import { API_BASE_URL } from './apiConfig'

export async function loginRequest({ nama_pengguna, kata_sandi }) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nama_pengguna, kata_sandi }),
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Login gagal.')
  }

  return result.data
}

export async function getCurrentUser(token) {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Profil tidak dapat dimuat.')
  }

  return result.data
}
