const bcrypt = require('bcryptjs');
const { timingSafeEqual } = require('node:crypto');
const readline = require('node:readline/promises');
const pool = require('../config/db');

const validateBootstrapInput = ({ username, password }) => {
  const normalizedUsername = typeof username === 'string' ? username.trim() : '';
  const passwordBytes = typeof password === 'string' ? Buffer.byteLength(password, 'utf8') : 0;
  const passwordCharacters = typeof password === 'string' ? Array.from(password).length : 0;

  if (
    normalizedUsername.length < 3
    || normalizedUsername.length > 64
    || /[\u0000-\u001f\u007f]/.test(normalizedUsername)
  ) {
    throw new Error('Nama pengguna harus terdiri dari 3 sampai 64 karakter tanpa karakter kontrol.');
  }

  if (passwordCharacters < 12 || passwordBytes > 72) {
    throw new Error('Kata sandi harus sekurangnya 12 karakter dan maksimal 72 byte untuk kompatibilitas bcrypt.');
  }

  return { username: normalizedUsername };
};

const readHiddenPassword = (prompt) => new Promise((resolve, reject) => {
  const input = process.stdin;
  const output = process.stdout;

  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    reject(new Error('Bootstrap harus dijalankan dari terminal interaktif agar kata sandi tidak terlihat.'));
    return;
  }

  let bytes = Buffer.alloc(0);
  let settled = false;

  const cleanup = () => {
    input.removeListener('data', onData);
    input.setRawMode(false);
    input.pause();
    output.write('\n');
  };

  const finish = (error, value) => {
    if (settled) return;
    settled = true;
    cleanup();
    if (error) reject(error);
    else resolve(value);
  };

  const onData = (chunk) => {
    for (const byte of chunk) {
      if (byte === 3) {
        finish(new Error('Bootstrap dibatalkan.'));
        return;
      }

      if (byte === 10 || byte === 13) {
        try {
          const password = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
          finish(null, password);
        } catch {
          finish(new Error('Kata sandi harus berupa teks UTF-8 yang valid.'));
        }
        return;
      }

      if (byte === 8 || byte === 127) {
        if (bytes.length > 0) {
          let lastCharacterStart = bytes.length - 1;
          while (
            lastCharacterStart > 0
            && (bytes[lastCharacterStart] & 0xc0) === 0x80
          ) {
            lastCharacterStart -= 1;
          }
          bytes = bytes.subarray(0, lastCharacterStart);
        }
        continue;
      }

      if (byte >= 32 && byte !== 127 && bytes.length < 1024) {
        bytes = Buffer.concat([bytes, Buffer.from([byte])]);
      }
    }
  };

  output.write(prompt);
  input.setRawMode(true);
  input.resume();
  input.on('data', onData);
});

const createInitialAdmin = async ({ username, passwordHash }) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;
    await client.query('SELECT pg_advisory_xact_lock($1, $2)', [1379670833, 1]);

    const existingAdmin = await client.query(
      "SELECT 1 FROM pengguna WHERE peran = 'admin' LIMIT 1"
    );

    if (existingAdmin.rowCount > 0) {
      const error = new Error('Akun admin sudah ada; bootstrap ditolak.');
      error.code = 'ADMIN_EXISTS';
      throw error;
    }

    const result = await client.query(
      `
        INSERT INTO pengguna (nama_pengguna, kata_sandi_hash, peran, status_aktif)
        VALUES ($1, $2, 'admin', TRUE)
        RETURNING id_pengguna
      `,
      [username, passwordHash]
    );

    await client.query('COMMIT');
    transactionStarted = false;
    return result.rows[0].id_pengguna;
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK');
    }

    if (error.code === '23505') {
      const conflict = new Error('Nama pengguna sudah digunakan.');
      conflict.code = 'USERNAME_EXISTS';
      throw conflict;
    }

    throw error;
  } finally {
    client.release();
  }
};

const main = async () => {
  const prompt = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let username;
  try {
    username = await prompt.question('Nama pengguna admin: ');
  } finally {
    prompt.close();
  }

  const password = await readHiddenPassword('Kata sandi admin (tidak ditampilkan): ');
  const confirmation = await readHiddenPassword('Ulangi kata sandi: ');
  const firstPassword = Buffer.from(password, 'utf8');
  const secondPassword = Buffer.from(confirmation, 'utf8');

  if (
    firstPassword.length !== secondPassword.length
    || !timingSafeEqual(firstPassword, secondPassword)
  ) {
    throw new Error('Konfirmasi kata sandi tidak cocok.');
  }

  const validated = validateBootstrapInput({ username, password });
  const passwordHash = await bcrypt.hash(password, 12);
  const id = await createInitialAdmin({
    username: validated.username,
    passwordHash,
  });

  console.log(`Akun admin awal berhasil dibuat (ID: ${id}).`);
};

if (require.main === module) {
  main()
    .catch((error) => {
      if (error.code === 'ADMIN_EXISTS' || error.code === 'USERNAME_EXISTS') {
        console.error(error.message);
      } else if (error.message === 'Bootstrap dibatalkan.') {
        console.error(error.message);
      } else if (
        error.message === 'Konfirmasi kata sandi tidak cocok.'
        || error.message.startsWith('Nama pengguna')
        || error.message.startsWith('Kata sandi')
        || error.message.startsWith('Bootstrap harus')
      ) {
        console.error(error.message);
      } else {
        console.error('Bootstrap admin gagal. Periksa koneksi database dan skema tanpa membagikan kredensial.');
      }
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = {
  validateBootstrapInput,
  readHiddenPassword,
};
