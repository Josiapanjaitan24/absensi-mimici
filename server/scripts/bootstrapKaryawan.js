const bcrypt = require('bcryptjs');
const readline = require('node:readline/promises');
const pool = require('../config/db');
const { readHiddenPassword } = require('./bootstrapAdmin');

const REQUIRED_USER_COLUMNS = [
  'nama_pengguna',
  'kata_sandi_hash',
  'peran',
  'status_aktif',
];
const REQUIRED_EMPLOYEE_COLUMNS = [
  'id_pengguna',
  'nama_lengkap',
  'status_aktif',
];
const SUPPORTED_EMPLOYEE_COLUMNS = new Set([
  ...REQUIRED_EMPLOYEE_COLUMNS,
  'kode_karyawan',
  'id_cabang_utama',
]);

const isInsertable = (column) => (
  column
  && column.is_identity !== 'YES'
  && column.is_generated === 'NEVER'
);

const validateBootstrapInput = ({
  username,
  fullName,
  password,
  employeeCode,
  branchId,
}) => {
  const normalizedUsername = typeof username === 'string' ? username.trim() : '';
  const normalizedFullName = typeof fullName === 'string' ? fullName.trim() : '';
  const normalizedEmployeeCode = typeof employeeCode === 'string'
    ? employeeCode.trim()
    : '';
  const passwordBytes = typeof password === 'string'
    ? Buffer.byteLength(password, 'utf8')
    : 0;
  const passwordCharacters = typeof password === 'string'
    ? Array.from(password).length
    : 0;

  if (
    normalizedUsername.length < 3
    || normalizedUsername.length > 64
    || /[\u0000-\u001f\u007f]/.test(normalizedUsername)
  ) {
    throw new Error('Nama pengguna harus terdiri dari 3 sampai 64 karakter tanpa karakter kontrol.');
  }

  if (
    normalizedFullName.length < 2
    || normalizedFullName.length > 150
    || /[\u0000-\u001f\u007f]/.test(normalizedFullName)
  ) {
    throw new Error('Nama lengkap harus terdiri dari 2 sampai 150 karakter tanpa karakter kontrol.');
  }

  if (passwordCharacters < 12 || passwordBytes > 72) {
    throw new Error('Kata sandi harus sekurangnya 12 karakter dan maksimal 72 byte untuk kompatibilitas bcrypt.');
  }

  if (
    normalizedEmployeeCode.length > 64
    || /[\u0000-\u001f\u007f]/.test(normalizedEmployeeCode)
  ) {
    throw new Error('Kode karyawan maksimal 64 karakter tanpa karakter kontrol.');
  }

  let normalizedBranchId = null;
  if (branchId !== undefined && branchId !== null && branchId !== '') {
    const value = String(branchId).trim();
    if (!/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) {
      throw new Error('ID cabang harus berupa bilangan bulat positif yang valid.');
    }
    normalizedBranchId = value;
  }

  return {
    username: normalizedUsername,
    fullName: normalizedFullName,
    employeeCode: normalizedEmployeeCode || null,
    branchId: normalizedBranchId,
  };
};

const getBootstrapSchema = async (client) => {
  const result = await client.query(
    `
      SELECT
        table_name,
        column_name,
        is_nullable,
        column_default,
        is_identity,
        is_generated
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name IN ('pengguna', 'karyawan')
      ORDER BY table_name, ordinal_position
    `
  );
  const schema = {
    pengguna: new Map(),
    karyawan: new Map(),
  };

  for (const column of result.rows) {
    schema[column.table_name].set(column.column_name, column);
  }

  const missingTables = Object.entries(schema)
    .filter(([, columns]) => columns.size === 0)
    .map(([table]) => table);
  if (missingTables.length > 0) {
    throw new Error('Tabel yang diperlukan tidak ditemukan pada schema database aktif.');
  }

  const missingRequiredColumns = [
    ...REQUIRED_USER_COLUMNS
      .filter((name) => !schema.pengguna.has(name))
      .map((name) => `pengguna.${name}`),
    ...REQUIRED_EMPLOYEE_COLUMNS
      .filter((name) => !schema.karyawan.has(name))
      .map((name) => `karyawan.${name}`),
  ];
  if (missingRequiredColumns.length > 0) {
    throw new Error(`Skema tidak kompatibel; kolom wajib tidak ditemukan: ${missingRequiredColumns.join(', ')}.`);
  }

  const nonInsertableRequiredColumns = [
    ...REQUIRED_USER_COLUMNS
      .filter((name) => !isInsertable(schema.pengguna.get(name)))
      .map((name) => `pengguna.${name}`),
    ...REQUIRED_EMPLOYEE_COLUMNS
      .filter((name) => !isInsertable(schema.karyawan.get(name)))
      .map((name) => `karyawan.${name}`),
  ];
  if (nonInsertableRequiredColumns.length > 0) {
    throw new Error(
      `Skema tidak kompatibel; kolom wajib tidak dapat diisi: ${nonInsertableRequiredColumns.join(', ')}.`
    );
  }

  const unsupportedRequiredColumns = [...schema.pengguna.values()]
    .filter((column) => (
      column.is_nullable === 'NO'
      && column.column_default === null
      && column.is_identity !== 'YES'
      && column.is_generated === 'NEVER'
      && !REQUIRED_USER_COLUMNS.includes(column.column_name)
    ))
    .map((column) => `pengguna.${column.column_name}`)
    .concat(
      [...schema.karyawan.values()]
        .filter((column) => (
          column.is_nullable === 'NO'
          && column.column_default === null
          && column.is_identity !== 'YES'
          && column.is_generated === 'NEVER'
          && !SUPPORTED_EMPLOYEE_COLUMNS.has(column.column_name)
        ))
        .map((column) => `karyawan.${column.column_name}`)
    );
  if (unsupportedRequiredColumns.length > 0) {
    throw new Error(
      `Bootstrap dihentikan karena skema memiliki kolom wajib yang belum didukung: ${unsupportedRequiredColumns.join(', ')}.`
    );
  }

  return schema;
};

const getPromptRequirements = (schema) => ({
  employeeCodeRequired: isInsertable(schema.karyawan.get('kode_karyawan'))
    && schema.karyawan.get('kode_karyawan').is_nullable === 'NO'
    && schema.karyawan.get('kode_karyawan').column_default === null,
  branchRequired: isInsertable(schema.karyawan.get('id_cabang_utama'))
    && schema.karyawan.get('id_cabang_utama').is_nullable === 'NO'
    && schema.karyawan.get('id_cabang_utama').column_default === null,
  hasEmployeeCode: isInsertable(schema.karyawan.get('kode_karyawan')),
  hasMainBranch: isInsertable(schema.karyawan.get('id_cabang_utama')),
});

const createEmployeeAccount = async (
  { username, fullName, employeeCode, branchId, passwordHash },
  dbPool = pool
) => {
  const client = await dbPool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;
    await client.query('SELECT pg_advisory_xact_lock($1, $2)', [1379670833, 1]);
    const schema = await getBootstrapSchema(client);
    const requirements = getPromptRequirements(schema);

    if (requirements.employeeCodeRequired && !employeeCode) {
      throw new Error('Kolom kode_karyawan wajib diisi pada database ini.');
    }
    if (requirements.branchRequired && !branchId) {
      throw new Error('Kolom id_cabang_utama wajib diisi pada database ini.');
    }
    if (!requirements.hasEmployeeCode && employeeCode) {
      throw new Error('Skema database tidak memiliki kolom kode_karyawan.');
    }
    if (!requirements.hasMainBranch && branchId) {
      throw new Error('Skema database tidak memiliki kolom id_cabang_utama.');
    }

    if (branchId) {
      const branch = await client.query(
        'SELECT 1 FROM cabang WHERE id_cabang = $1 AND status_aktif = TRUE LIMIT 1',
        [branchId]
      );
      if (branch.rowCount === 0) {
        const error = new Error('Cabang tidak ditemukan atau tidak aktif.');
        error.code = 'BRANCH_UNAVAILABLE';
        throw error;
      }
    }

    const userResult = await client.query(
      `
        INSERT INTO pengguna (nama_pengguna, kata_sandi_hash, peran, status_aktif)
        VALUES ($1, $2, 'karyawan', TRUE)
        RETURNING id_pengguna
      `,
      [username, passwordHash]
    );
    const userId = userResult.rows[0].id_pengguna;
    const employeeColumns = ['id_pengguna', 'nama_lengkap', 'status_aktif'];
    const employeeValues = [userId, fullName, true];

    if (requirements.hasEmployeeCode && employeeCode) {
      employeeColumns.push('kode_karyawan');
      employeeValues.push(employeeCode);
    }
    if (requirements.hasMainBranch && branchId) {
      employeeColumns.push('id_cabang_utama');
      employeeValues.push(branchId);
    }

    const quotedColumns = employeeColumns.map((column) => `"${column}"`).join(', ');
    const placeholders = employeeValues.map((_, index) => `$${index + 1}`).join(', ');
    await client.query(
      `INSERT INTO karyawan (${quotedColumns}) VALUES (${placeholders})`,
      employeeValues
    );

    await client.query('COMMIT');
    transactionStarted = false;
    return userId;
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK');
    }

    if (error.code === '23505') {
      const conflict = new Error('Nama pengguna atau kode karyawan sudah digunakan.');
      conflict.code = 'EMPLOYEE_EXISTS';
      throw conflict;
    }

    throw error;
  } finally {
    client.release();
  }
};

const promptLine = async (prompt) => {
  const readlineInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    return (await readlineInterface.question(prompt)).trim();
  } finally {
    readlineInterface.close();
  }
};

const main = async () => {
  const schemaClient = await pool.connect();
  let schema;
  try {
    schema = await getBootstrapSchema(schemaClient);
  } finally {
    schemaClient.release();
  }

  const requirements = getPromptRequirements(schema);
  const username = await promptLine('Nama pengguna karyawan: ');
  const fullName = await promptLine('Nama lengkap karyawan: ');
  const employeeCode = requirements.hasEmployeeCode
    ? await promptLine(`Kode karyawan${requirements.employeeCodeRequired ? '' : ' (opsional)'}: `)
    : '';
  const branchId = requirements.hasMainBranch
    ? await promptLine(`ID cabang utama${requirements.branchRequired ? '' : ' (opsional)'}: `)
    : '';
  const password = await readHiddenPassword('Kata sandi (tidak ditampilkan): ');
  const confirmation = await readHiddenPassword('Ulangi kata sandi: ');

  if (password.length !== confirmation.length || !Buffer.from(password).equals(Buffer.from(confirmation))) {
    throw new Error('Konfirmasi kata sandi tidak cocok.');
  }

  const input = validateBootstrapInput({
    username,
    fullName,
    password,
    employeeCode,
    branchId,
  });
  const passwordHash = await bcrypt.hash(password, 12);
  const id = await createEmployeeAccount({ ...input, passwordHash });

  console.log(`Akun karyawan berhasil dibuat (ID pengguna: ${id}).`);
};

if (require.main === module) {
  main()
    .catch((error) => {
      if (
        error.code === 'EMPLOYEE_EXISTS'
        || error.code === 'BRANCH_UNAVAILABLE'
        || error.message.startsWith('Nama pengguna')
        || error.message.startsWith('Nama lengkap')
        || error.message.startsWith('Kata sandi')
        || error.message.startsWith('Kode karyawan')
        || error.message.startsWith('ID cabang')
        || error.message.startsWith('Skema')
        || error.message.startsWith('Bootstrap')
        || error.message === 'Konfirmasi kata sandi tidak cocok.'
        || error.message === 'Cabang tidak ditemukan atau tidak aktif.'
      ) {
        console.error(error.message);
      } else {
        console.error('Bootstrap karyawan gagal. Periksa koneksi database dan skema tanpa membagikan kredensial.');
      }
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = {
  validateBootstrapInput,
  getBootstrapSchema,
  getPromptRequirements,
  createEmployeeAccount,
};
