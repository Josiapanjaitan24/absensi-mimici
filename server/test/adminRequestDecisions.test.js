const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateEmployeeRequestId,
  validateEmployeeRequestDecision,
} = require('../middleware/adminValidators');
const { updateEmployeeRequestDecision } = require('../services/adminService');

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const createRequestDb = (status = 'menunggu') => {
  const queries = [];
  const client = {
    async query(sql, values = []) {
      queries.push({ sql, values });
      if (sql.includes('SELECT status_pengajuan')) {
        return status === null
          ? { rowCount: 0, rows: [] }
          : { rowCount: 1, rows: [{ status_pengajuan: status }] };
      }
      if (sql.includes('UPDATE pengajuan_')) {
        return {
          rowCount: 1,
          rows: [{
            id_pengajuan: '21',
            status_pengajuan: values[1],
            catatan_admin: values[2],
            waktu_diproses: '2026-10-11T08:00:00.000Z',
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
  };
};

test('employee request ID validation only accepts positive integer IDs', () => {
  const request = { params: { id: '17' } };
  let nextCalled = false;
  validateEmployeeRequestId(request, createResponse(), () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.equal(request.validatedEmployeeRequestId, '17');

  for (const id of ['0', '-2', '1.5', 'abc']) {
    const response = createResponse();
    validateEmployeeRequestId({ params: { id } }, response, () => {});
    assert.equal(response.statusCode, 400);
  }
});

test('request decision validation normalizes optional admin notes', () => {
  const request = { body: { status_pengajuan: 'disetujui', catatan_admin: '  Silakan.  ' } };
  let nextCalled = false;
  validateEmployeeRequestDecision(request, createResponse(), () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.deepEqual(request.validatedEmployeeRequestDecision, {
    status_pengajuan: 'disetujui',
    catatan_admin: 'Silakan.',
  });

  for (const body of [
    {},
    { status_pengajuan: 'menunggu' },
    { status_pengajuan: 'ditolak', catatan_admin: 'x'.repeat(2001) },
    { status_pengajuan: 'ditolak', unexpected: true },
  ]) {
    const response = createResponse();
    validateEmployeeRequestDecision({ body }, response, () => {});
    assert.equal(response.statusCode, 400);
  }
});

test('admin decision updates only a pending leave request and records processor and note', async () => {
  const db = createRequestDb();
  const result = await updateEmployeeRequestDecision(
    'izin',
    '21',
    { status_pengajuan: 'disetujui', catatan_admin: 'Disetujui.' },
    '3',
    db
  );

  const update = db.queries.find(({ sql }) => sql.includes('UPDATE pengajuan_izin'));
  assert.ok(update);
  assert.match(update.sql, /status_pengajuan = 'menunggu'/);
  assert.match(update.sql, /id_pengguna_pemroses = \$4/);
  assert.deepEqual(update.values, ['21', 'disetujui', 'Disetujui.', '3']);
  assert.equal(result.status_pengajuan, 'disetujui');
  assert.equal(db.queries.at(-1).sql, 'COMMIT');
});

test('admin decision only changes the request status for schedule changes', async () => {
  const db = createRequestDb();
  await updateEmployeeRequestDecision(
    'perubahan-jadwal',
    '21',
    { status_pengajuan: 'ditolak', catatan_admin: null },
    '3',
    db
  );

  const update = db.queries.find(({ sql }) => sql.includes('UPDATE pengajuan_perubahan_jadwal'));
  assert.ok(update);
  assert.doesNotMatch(update.sql, /UPDATE jadwal_kerja/);
  assert.equal(update.values[1], 'ditolak');
});

test('admin decision cannot reprocess a previously decided request', async () => {
  const db = createRequestDb('disetujui');
  await assert.rejects(
    updateEmployeeRequestDecision(
      'izin',
      '21',
      { status_pengajuan: 'ditolak', catatan_admin: null },
      '3',
      db
    ),
    (error) => error.statusCode === 409
  );
  assert.equal(db.queries.at(-1).sql, 'ROLLBACK');
  assert.equal(db.queries.some(({ sql }) => sql.includes('UPDATE pengajuan_izin')), false);
});

test('admin decision reports requests that do not exist', async () => {
  const db = createRequestDb(null);
  await assert.rejects(
    updateEmployeeRequestDecision(
      'perubahan-jadwal',
      '21',
      { status_pengajuan: 'ditolak', catatan_admin: null },
      '3',
      db
    ),
    (error) => error.statusCode === 404
  );
  assert.equal(db.queries.at(-1).sql, 'ROLLBACK');
});
