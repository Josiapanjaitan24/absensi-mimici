const test = require('node:test');
const assert = require('node:assert/strict');
const { requireRole } = require('../middleware/auth');
const {
  validateBranchId,
  validateBranchUpdate,
} = require('../middleware/adminValidators');
const { validateBootstrapInput } = require('../scripts/bootstrapAdmin');

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

test('admin role middleware allows admins and rejects employees', () => {
  const middleware = requireRole('admin');
  const adminResponse = createResponse();
  let adminNext = false;
  middleware({ user: { peran: 'admin' } }, adminResponse, () => {
    adminNext = true;
  });
  assert.equal(adminNext, true);

  const employeeResponse = createResponse();
  let employeeNext = false;
  middleware({ user: { peran: 'karyawan' } }, employeeResponse, () => {
    employeeNext = true;
  });
  assert.equal(employeeNext, false);
  assert.equal(employeeResponse.statusCode, 403);
  assert.equal(employeeResponse.body.message, 'Akses ditolak untuk peran ini.');
});

test('branch update accepts only a boolean status and positive integer radius', () => {
  const validStatus = {
    body: { status_aktif: false },
  };
  let statusNext = false;
  validateBranchUpdate(validStatus, createResponse(), () => {
    statusNext = true;
  });
  assert.equal(statusNext, true);
  assert.deepEqual(validStatus.validatedBranchChanges, { status_aktif: false });

  const validRadius = {
    body: { radius_meter: 100 },
  };
  let radiusNext = false;
  validateBranchUpdate(validRadius, createResponse(), () => {
    radiusNext = true;
  });
  assert.equal(radiusNext, true);
  assert.deepEqual(validRadius.validatedBranchChanges, { radius_meter: 100 });

  for (const body of [
    {},
    { status_aktif: 'false' },
    { radius_meter: 0 },
    { radius_meter: 101 },
    { radius_meter: 12.5 },
    { radius_meter: 2147483648 },
    { radius_meter: '100' },
    { latitude: -6.2 },
    { status_aktif: true, extra: 'value' },
  ]) {
    const response = createResponse();
    let nextCalled = false;
    validateBranchUpdate({ body }, response, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(response.statusCode, 400);
  }
});

test('branch ID validation rejects zero and non-numeric identifiers', () => {
  for (const id of ['0', 'abc', '-1']) {
    const response = createResponse();
    let nextCalled = false;
    validateBranchId({ params: { id } }, response, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(response.statusCode, 400);
  }

  const request = { params: { id: '6' } };
  let nextCalled = false;
  validateBranchId(request, createResponse(), () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.equal(request.validatedBranchId, '6');
});

test('bootstrap input requires a valid username and bcrypt-compatible strong password', () => {
  assert.deepEqual(
    validateBootstrapInput({ username: '  mimici.admin  ', password: 'a-strong-password-1' }),
    { username: 'mimici.admin' }
  );

  for (const input of [
    { username: 'ab', password: 'a-strong-password-1' },
    { username: 'valid-user', password: 'too-short' },
    { username: 'valid-user', password: '😀'.repeat(4) },
    { username: 'valid-user', password: 'p'.repeat(73) },
    { username: 'bad\nname', password: 'a-strong-password-1' },
  ]) {
    assert.throws(() => validateBootstrapInput(input));
  }
});
