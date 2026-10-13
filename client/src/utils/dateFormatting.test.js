import test from 'node:test'
import assert from 'node:assert/strict'
import { formatDate, formatDateTime, getJakartaDate } from './dateFormatting.js'

test('formats a date-only value and an ISO timestamp consistently', () => {
  assert.equal(
    formatDate('2026-10-13T00:00:00.000Z'),
    formatDate('2026-10-13')
  )
})

test('formats PostgreSQL timestamps consistently with ISO timestamps', () => {
  assert.equal(
    formatDateTime('2026-10-13 08:30:00+07'),
    formatDateTime('2026-10-13T01:30:00Z')
  )
})

test('uses readable fallbacks for missing or malformed dates', () => {
  assert.equal(formatDate(null), '—')
  assert.equal(formatDate('not-a-date'), '—')
  assert.equal(formatDateTime('not-a-timestamp'), '—')
  assert.equal(formatDateTime(null, 'Belum tercatat'), 'Belum tercatat')
})

test('returns the Jakarta calendar date in a stable ISO format', () => {
  assert.match(getJakartaDate(), /^\d{4}-\d{2}-\d{2}$/)
})
