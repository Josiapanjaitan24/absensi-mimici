const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const getUserByUsername = async (nama_pengguna) => {
  const result = await pool.query(
    `
      SELECT
        id_pengguna,
        nama_pengguna,
        kata_sandi_hash,
        peran,
        status_aktif
      FROM pengguna
      WHERE nama_pengguna = $1
      LIMIT 1
    `,
    [nama_pengguna]
  );

  return result.rows[0] || null;
};

const getUserProfile = async (id_pengguna) => {
  const result = await pool.query(
    `
      SELECT
        p.id_pengguna,
        p.nama_pengguna,
        p.peran,
        p.status_aktif,
        k.nama_lengkap,
        k.id_cabang_utama
      FROM pengguna p
      LEFT JOIN karyawan k ON k.id_pengguna = p.id_pengguna
      WHERE p.id_pengguna = $1
      LIMIT 1
    `,
    [id_pengguna]
  );

  return result.rows[0] || null;
};

const loginUser = async ({ nama_pengguna, kata_sandi }) => {
  if (!nama_pengguna || !kata_sandi) {
    const error = new Error('Nama pengguna dan kata sandi wajib diisi.');
    error.statusCode = 400;
    throw error;
  }

  const user = await getUserByUsername(nama_pengguna);

  if (!user) {
    const error = new Error('Kredensial tidak valid.');
    error.statusCode = 401;
    throw error;
  }

  if (!user.status_aktif) {
    const error = new Error('Akun tidak aktif.');
    error.statusCode = 403;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(kata_sandi, user.kata_sandi_hash);

  if (!passwordMatches) {
    const error = new Error('Kredensial tidak valid.');
    error.statusCode = 401;
    throw error;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    const error = new Error('Konfigurasi JWT belum tersedia di environment.');
    error.statusCode = 500;
    throw error;
  }

  const token = jwt.sign(
    {
      sub: user.id_pengguna,
      username: user.nama_pengguna,
      role: user.peran,
    },
    secret,
    {
      expiresIn: '8h',
      issuer: 'absensi-mimici',
    }
  );

  return {
    token,
    user: {
      id_pengguna: user.id_pengguna,
      nama_pengguna: user.nama_pengguna,
      peran: user.peran,
    },
  };
};

module.exports = {
  getUserProfile,
  loginUser,
};
