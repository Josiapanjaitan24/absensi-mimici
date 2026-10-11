const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getBranchAttendanceStatus,
  recordBranchAttendance,
} = require('../services/employeeService');

const createAttendancePool = ({ existing = null, branch = {} } = {}) => {
  const queries = [];
  const branchRow = {
    id_cabang: '4',
    nama_cabang: 'Pakuan',
    latitude: '0',
    longitude: '0',
    status_aktif: true,
    tanggal: '2026-10-11',
    ...branch,
  };
  const client = {
    async query(sql, values = []) {
      queries.push({ sql, values });
      if (sql.includes('FROM cabang') && sql.includes('FOR SHARE')) {
        return { rowCount: branchRow ? 1 : 0, rows: branchRow ? [branchRow] : [] };
      }
      if (sql.includes('FROM cabang') && sql.includes('LEFT JOIN absensi')) {
        return { rowCount: branchRow ? 1 : 0, rows: branchRow ? [branchRow] : [] };
      }
      if (sql.includes('FROM absensi') && sql.includes('FOR UPDATE')) {
        return { rowCount: existing ? 1 : 0, rows: existing ? [existing] : [] };
      }
      if (sql.includes('INSERT INTO absensi')) {
        return {
          rowCount: 1,
          rows: [{
            id_absensi: '12',
            id_cabang: values[1],
            tanggal: values[2],
            jam_masuk: '08:30:00',
            jam_pulang: null,
            status_absensi: 'hadir',
          }],
        };
      }
      if (sql.includes('UPDATE absensi')) {
        return {
          rowCount: 1,
          rows: [{
            id_absensi: values[0],
            id_cabang: '4',
            tanggal: '2026-10-11',
            jam_masuk: '08:30:00',
            jam_pulang: '17:00:00',
            status_absensi: 'hadir',
          }],
        };
      }
      return { rowCount: 1, rows: [] };
    },
    release() {},
  };
  return {
    queries,
    async connect() {
      return client;
    },
    async query(sql, values) {
      return client.query(sql, values);
    },
  };
};

test('branch attendance status is queried for the employee, selected branch, and current Jakarta date', async () => {
  const db = createAttendancePool();
  await getBranchAttendanceStatus('7', '4', db);
  assert.match(db.queries[0].sql, /a\.id_karyawan = \$1/);
  assert.match(db.queries[0].sql, /a\.id_cabang = c\.id_cabang/);
  assert.deepEqual(db.queries[0].values, ['7', '4']);
});

test('first attendance records check-in for a branch without a schedule', async () => {
  const db = createAttendancePool();
  const result = await recordBranchAttendance('7', {
    id_cabang: '4',
    latitude: 0,
    longitude: 0,
  }, db);

  const insert = db.queries.find(({ sql }) => sql.includes('INSERT INTO absensi'));
  assert.ok(insert);
  assert.match(insert.sql, /id_jadwal/);
  assert.match(insert.sql, /NULL/);
  assert.deepEqual(insert.values, ['7', '4', '2026-10-11']);
  assert.equal(result.action, 'masuk');
  assert.equal(result.status_absensi, 'hadir');
  assert.equal(db.queries.at(-1).sql, 'COMMIT');
});

test('second attendance for the same branch and date records check-out', async () => {
  const db = createAttendancePool({
    existing: { id_absensi: '12', jam_masuk: '08:30:00', jam_pulang: null },
  });
  const result = await recordBranchAttendance('7', {
    id_cabang: '4',
    latitude: 0,
    longitude: 0,
  }, db);

  assert.equal(result.action, 'pulang');
  assert.equal(result.jam_pulang, '17:00:00');
  assert.ok(db.queries.some(({ sql }) => sql.includes('UPDATE absensi')));
});

test('branch attendance rejects a location beyond 100 meters and rolls back', async () => {
  const db = createAttendancePool();
  await assert.rejects(
    recordBranchAttendance('7', {
      id_cabang: '4',
      latitude: 0,
      longitude: 0.0011,
    }, db),
    (error) => error.statusCode === 403 && /100 meter/.test(error.message)
  );
  assert.equal(db.queries.at(-1).sql, 'ROLLBACK');
  assert.equal(db.queries.some(({ sql }) => sql.includes('INSERT INTO absensi')), false);
});

test('branch attendance rejects a completed record instead of overwriting it', async () => {
  const db = createAttendancePool({
    existing: { id_absensi: '12', jam_masuk: '08:30:00', jam_pulang: '17:00:00' },
  });
  await assert.rejects(
    recordBranchAttendance('7', {
      id_cabang: '4',
      latitude: 0,
      longitude: 0,
    }, db),
    (error) => error.statusCode === 409
  );
  assert.equal(db.queries.at(-1).sql, 'ROLLBACK');
});
