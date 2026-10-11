const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateDateRange,
  validateAttendanceRequest,
  validateBranchAttendanceRequest,
  validateAttendanceBranchId,
  validateLeaveRequest,
  validateScheduleChangeRequest,
} = require('../middleware/employeeValidators');
const {
  calculateTardiness,
  getShiftStartTimestamp,
  haversineDistanceMeters,
  isWithinAttendanceRadius,
} = require('../services/employeeService');

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

const invoke = (middleware, req) => {
  const res = createResponse();
  let nextCalled = false;
  middleware(req, res, () => {
    nextCalled = true;
  });
  return { req, res, nextCalled };
};

test('date range accepts valid dates and rejects invalid calendar dates', () => {
  const valid = invoke(validateDateRange, {
    query: { mulai: '2026-10-01', selesai: '2026-10-31' },
  });
  assert.equal(valid.nextCalled, true);
  assert.deepEqual(valid.req.dateRange, {
    mulai: '2026-10-01',
    selesai: '2026-10-31',
  });

  const invalid = invoke(validateDateRange, {
    query: { mulai: '2026-02-30', selesai: '2026-03-01' },
  });
  assert.equal(invalid.nextCalled, false);
  assert.equal(invalid.res.statusCode, 400);
});

test('date range is capped to 93 days', () => {
  const result = invoke(validateDateRange, {
    query: { mulai: '2026-01-01', selesai: '2026-04-05' },
  });
  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 400);
});

test('attendance validation requires positive schedule id and bounded numeric coordinates', () => {
  const valid = invoke(validateAttendanceRequest, {
    body: { id_jadwal: '5', latitude: -6.25, longitude: 106.8 },
  });
  assert.equal(valid.nextCalled, true);
  assert.deepEqual(valid.req.validatedAttendance, {
    id_jadwal: '5',
    latitude: -6.25,
    longitude: 106.8,
  });

  test('branch attendance validation requires a branch and valid GPS coordinates', () => {
    const valid = invoke(validateBranchAttendanceRequest, {
      body: { id_cabang: '6', latitude: -6.25, longitude: 106.8 },
    });
    assert.equal(valid.nextCalled, true);
    assert.deepEqual(valid.req.validatedBranchAttendance, {
      id_cabang: '6',
      latitude: -6.25,
      longitude: 106.8,
    });

    for (const body of [
      { id_cabang: '0', latitude: 0, longitude: 0 },
      { id_cabang: '1', latitude: -91, longitude: 0 },
      { id_cabang: '1', latitude: 0, longitude: 181 },
      { id_cabang: '1', latitude: '0', longitude: 0 },
    ]) {
      const result = invoke(validateBranchAttendanceRequest, { body });
      assert.equal(result.nextCalled, false);
      assert.equal(result.res.statusCode, 400);
    }

    const validId = invoke(validateAttendanceBranchId, { params: { id: '2' } });
    assert.equal(validId.nextCalled, true);
    assert.equal(validId.req.validatedAttendanceBranchId, '2');
    const invalidId = invoke(validateAttendanceBranchId, { params: { id: '0' } });
    assert.equal(invalidId.nextCalled, false);
    assert.equal(invalidId.res.statusCode, 400);
  });

  const invalid = invoke(validateAttendanceRequest, {
    body: { id_jadwal: '0', latitude: '0', longitude: 181 },
  });
  assert.equal(invalid.nextCalled, false);
  assert.equal(invalid.res.statusCode, 400);
});

test('leave requests accept only valid leave/sick ranges and required reason', () => {
  const valid = invoke(validateLeaveRequest, {
    body: {
      tanggal_mulai: '2026-10-12',
      tanggal_selesai: '2026-10-13',
      jenis_pengajuan: 'sakit',
      alasan: 'Perlu istirahat',
    },
  });
  assert.equal(valid.nextCalled, true);
  assert.equal(valid.req.validatedLeave.status_pengajuan, undefined);
  assert.equal(valid.req.validatedLeave.jenis_pengajuan, 'sakit');

  const invalid = invoke(validateLeaveRequest, {
    body: {
      tanggal_mulai: '2026-10-13',
      tanggal_selesai: '2026-10-12',
      jenis_pengajuan: 'izin',
      alasan: 'Alasan valid',
    },
  });
  assert.equal(invalid.nextCalled, false);
  assert.equal(invalid.res.statusCode, 400);
});

test('schedule change validation restricts request type and normalizes optional IDs', () => {
  const valid = invoke(validateScheduleChangeRequest, {
    body: {
      tanggal_jadwal_baru: '2026-10-13',
      jenis_perubahan: 'ubah_jadwal',
      alasan: 'Ada keperluan pribadi',
      id_jadwal_asal: 17,
    },
  });
  assert.equal(valid.nextCalled, true);
  assert.equal(valid.req.validatedScheduleChange.id_jadwal_asal, '17');
  assert.equal(valid.req.validatedScheduleChange.id_shift_baru, null);

  const invalid = invoke(validateScheduleChangeRequest, {
    body: {
      tanggal_jadwal_baru: '2026-10-13',
      jenis_perubahan: 'unknown',
      alasan: 'Ada keperluan pribadi',
    },
  });
  assert.equal(invalid.nextCalled, false);
  assert.equal(invalid.res.statusCode, 400);
});

test('attendance keeps the configured ten-minute tolerance without generating alfa', () => {
  const shiftStart = getShiftStartTimestamp('2026-10-11', '08:00:00');
  const onTolerance = calculateTardiness(shiftStart + 10 * 60000, '2026-10-11', '08:00:00', 10);
  const beyondTolerance = calculateTardiness(shiftStart + 11 * 60000, '2026-10-11', '08:00:00', 10);

  assert.deepEqual(onTolerance, {
    minutesLate: 10,
    minutesOutsideTolerance: 0,
    status: 'hadir',
  });
  assert.deepEqual(beyondTolerance, {
    minutesLate: 11,
    minutesOutsideTolerance: 1,
    status: 'telat',
  });
  assert.ok(!['alfa'].includes(onTolerance.status));
  assert.ok(!['alfa'].includes(beyondTolerance.status));
});

test('GPS distance calculation returns zero at the branch coordinate', () => {
  assert.equal(haversineDistanceMeters(-6.2, 106.8, -6.2, 106.8), 0);
});

test('attendance GPS accepts at most 100 meters and never exceeds a stricter branch radius', () => {
  assert.equal(isWithinAttendanceRadius(100, 250), true);
  assert.equal(isWithinAttendanceRadius(100.01, 250), false);
  assert.equal(isWithinAttendanceRadius(80, 80), true);
  assert.equal(isWithinAttendanceRadius(80.01, 80), false);
  assert.equal(isWithinAttendanceRadius(100, null), true);
});
