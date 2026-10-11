const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateBootstrapInput,
  getBootstrapSchema,
  getPromptRequirements,
  createEmployeeAccount,
} = require('../scripts/bootstrapKaryawan');

const column = (table_name, column_name, {
  is_nullable = 'NO',
  column_default = null,
  is_identity = 'NO',
  is_generated = 'NEVER',
} = {}) => ({
  table_name,
  column_name,
  is_nullable,
  column_default,
  is_identity,
  is_generated,
});

const supportedSchemaRows = () => [
  ...['nama_pengguna', 'kata_sandi_hash', 'peran', 'status_aktif']
    .map((name) => column('pengguna', name)),
  column('pengguna', 'id_pengguna', { column_default: "nextval('pengguna_id_seq'::regclass)" }),
  ...['id_pengguna', 'nama_lengkap', 'status_aktif', 'kode_karyawan', 'id_cabang_utama']
    .map((name) => column('karyawan', name, {
      is_nullable: name === 'kode_karyawan' || name === 'id_cabang_utama' ? 'YES' : 'NO',
    })),
  column('karyawan', 'id_karyawan', { column_default: "nextval('karyawan_id_seq'::regclass)" }),
];

const input = {
  username: '  karyawan.andi ',
  fullName: ' Andi Saputra ',
  employeeCode: ' K-001 ',
  branchId: '2',
  password: 'secure-passphrase-2026',
};

test('employee bootstrap validates and normalizes account input', () => {
  assert.deepEqual(validateBootstrapInput(input), {
    username: 'karyawan.andi',
    fullName: 'Andi Saputra',
    employeeCode: 'K-001',
    branchId: '2',
  });

  for (const invalid of [
    { ...input, username: 'ab' },
    { ...input, fullName: ' ' },
    { ...input, fullName: 'A'.repeat(151) },
    { ...input, password: 'short' },
    { ...input, password: '😀'.repeat(19) },
    { ...input, branchId: '0' },
    { ...input, branchId: '2; DROP TABLE karyawan' },
  ]) {
    assert.throws(() => validateBootstrapInput(invalid));
  }
});

test('employee bootstrap checks existing schema and detects required prompts', async () => {
  const schema = await getBootstrapSchema({
    query: async () => ({ rows: supportedSchemaRows() }),
  });
  assert.deepEqual(getPromptRequirements(schema), {
    employeeCodeRequired: false,
    branchRequired: false,
    hasEmployeeCode: true,
    hasMainBranch: true,
  });
});

test('employee bootstrap fails closed when schema has unsupported required fields', async () => {
  const rows = supportedSchemaRows();
  rows.push(column('karyawan', 'nomor_telepon'));
  await assert.rejects(
    getBootstrapSchema({ query: async () => ({ rows }) }),
    /kolom wajib yang belum didukung: karyawan\.nomor_telepon/
  );
});

test('employee account and profile are created in one transaction with a fixed employee role', async () => {
  const calls = [];
  const client = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (sql.includes('information_schema.columns')) {
        return { rows: supportedSchemaRows() };
      }
      if (sql.includes('SELECT 1 FROM cabang')) {
        return { rowCount: 1, rows: [{}] };
      }
      if (sql.includes('INSERT INTO pengguna')) {
        return { rows: [{ id_pengguna: 42 }] };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {
      calls.push({ sql: 'RELEASE' });
    },
  };
  const fakePool = { connect: async () => client };

  const id = await createEmployeeAccount({
    username: 'karyawan.andi',
    fullName: 'Andi Saputra',
    employeeCode: 'K-001',
    branchId: '2',
    passwordHash: '$2a$12$hash-for-test-only',
  }, fakePool);

  assert.equal(id, 42);
  assert.equal(calls[0].sql, 'BEGIN');
  assert.match(calls.find((call) => call.sql.includes('INSERT INTO pengguna')).sql, /'karyawan'/);
  assert.deepEqual(
    calls.find((call) => call.sql.includes('INSERT INTO pengguna')).values,
    ['karyawan.andi', '$2a$12$hash-for-test-only']
  );
  assert.match(calls.find((call) => call.sql.includes('INSERT INTO karyawan')).sql, /"kode_karyawan", "id_cabang_utama"/);
  assert.deepEqual(
    calls.find((call) => call.sql.includes('INSERT INTO karyawan')).values,
    [42, 'Andi Saputra', true, 'K-001', '2']
  );
  assert.equal(calls.at(-2).sql, 'COMMIT');
  assert.equal(calls.at(-1).sql, 'RELEASE');
});

test('employee profile insert failure rolls back the newly created user', async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql);
      if (sql.includes('information_schema.columns')) {
        return { rows: supportedSchemaRows() };
      }
      if (sql.includes('INSERT INTO pengguna')) {
        return { rows: [{ id_pengguna: 42 }] };
      }
      if (sql.includes('INSERT INTO karyawan')) {
        const error = new Error('duplicate');
        error.code = '23505';
        throw error;
      }
      return { rows: [], rowCount: 1 };
    },
    release() {},
  };

  await assert.rejects(
    createEmployeeAccount({
      username: 'karyawan.andi',
      fullName: 'Andi Saputra',
      employeeCode: null,
      branchId: null,
      passwordHash: '$2a$12$hash-for-test-only',
    }, { connect: async () => client }),
    { code: 'EMPLOYEE_EXISTS', message: 'Nama pengguna atau kode karyawan sudah digunakan.' }
  );
  assert.ok(calls.includes('ROLLBACK'));
  assert.ok(!calls.includes('COMMIT'));
});
