const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../config/db');
const { getDashboardSummary } = require('../services/adminService');

test('dashboard summary includes branch attendance without a schedule', async () => {
  const originalQuery = pool.query;
  let query;
  pool.query = async (sql, values) => {
    query = { sql, values };
    return { rows: [{ absensi_masuk_hari_ini: 1 }] };
  };

  try {
    const summary = await getDashboardSummary();

    assert.equal(summary.absensi_masuk_hari_ini, 1);
    assert.match(query.sql, /LEFT JOIN jadwal_kerja j ON j\.id_jadwal = a\.id_jadwal/);
    assert.match(query.sql, /COALESCE\(j\.tanggal_kerja, a\.tanggal\)/);
    assert.match(query.sql, /a\.waktu_masuk IS NOT NULL OR a\.jam_masuk IS NOT NULL/);
    assert.deepEqual(query.values, undefined);
  } finally {
    pool.query = originalQuery;
  }
});
