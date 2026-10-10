const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = randomBytes(32).toString('hex');

const app = require('../server');
const pool = require('../config/db');

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await pool.end();
});

test('existing public root, health, and branch endpoints remain available', async () => {
  const root = await fetch(`${baseUrl}/`);
  assert.equal(root.status, 200);
  assert.equal((await root.json()).success, true);

  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).success, true);

  const branches = await fetch(`${baseUrl}/api/cabang`);
  assert.equal(branches.status, 200);
  const branchResponse = await branches.json();
  assert.equal(branchResponse.success, true);
  assert.ok(Array.isArray(branchResponse.data));
});

test('employee endpoints reject requests without an authenticated identity', async () => {
  const endpoints = [
    ['GET', '/api/karyawan/shift'],
    ['GET', '/api/karyawan/jadwal'],
    ['GET', '/api/karyawan/absensi'],
    ['POST', '/api/karyawan/absensi/masuk'],
    ['POST', '/api/karyawan/absensi/pulang'],
    ['GET', '/api/karyawan/pengajuan-izin'],
    ['POST', '/api/karyawan/pengajuan-izin'],
    ['GET', '/api/karyawan/perubahan-jadwal'],
    ['POST', '/api/karyawan/perubahan-jadwal'],
  ];

  for (const [method, path] of endpoints) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {},
      body: method === 'POST' ? '{}' : undefined,
    });
    assert.equal(response.status, 401, `${method} ${path} must require auth`);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.equal(body.message, 'Token otorisasi diperlukan.');
  }
});

test('a token role claim cannot substitute for a current database identity', async () => {
  const token = jwt.sign(
    { sub: '999999999', username: 'not-a-real-user', role: 'karyawan' },
    process.env.JWT_SECRET,
    { expiresIn: '1m', issuer: 'absensi-mimici' }
  );
  const response = await fetch(`${baseUrl}/api/karyawan/jadwal`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    success: false,
    message: 'Akun tidak tersedia atau tidak aktif.',
  });
});

test('login rejects a nonexistent account without exposing credential details', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nama_pengguna: '__phase4_missing_account__',
      kata_sandi: 'not-a-real-password',
    }),
  });

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.deepEqual(body, {
    success: false,
    message: 'Kredensial tidak valid.',
  });
});
