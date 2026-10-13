const JAKARTA_TIME_ZONE = 'Asia/Jakarta'

export function getJakartaDate() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: JAKARTA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const dateParts = Object.fromEntries(parts.map(({ type, value }) => [type, value]))

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`
}

export function formatDate(value, style = 'medium') {
  if (!value) return '—'

  const dateValue = String(value).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return '—'

  const date = new Date(`${dateValue}T12:00:00+07:00`)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: style,
    timeZone: JAKARTA_TIME_ZONE,
  }).format(date)
}

export function formatDateTime(value, fallback = '—') {
  if (!value) return fallback

  const text = String(value).trim()
  if (/^\d{2}:\d{2}/.test(text)) return `${text.slice(0, 5)} WIB`

  const timestamp = text
    .replace(' ', 'T')
    .replace(/(\.\d{3})\d+(?=(?:Z|[+-]\d{2}(?::?\d{2})?)?$)/, '$1')
    .replace(/([+-]\d{2})$/, '$1:00')
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return fallback

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: JAKARTA_TIME_ZONE,
  }).format(date)
}
