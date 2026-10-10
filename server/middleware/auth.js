const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { buildError } = require('../utils/response');

const getTokenFromHeader = (authorizationHeader) => {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice(7).trim();
};

const requireAuth = async (req, res, next) => {
  const token = getTokenFromHeader(req.headers.authorization);

  if (!token) {
    return buildError(res, 401, 'Token otorisasi diperlukan.');
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return buildError(res, 500, 'Konfigurasi autentikasi belum tersedia.');
  }

  try {
    const payload = jwt.verify(token, secret);

    if (!payload.sub || !/^\d+$/.test(String(payload.sub))) {
      return buildError(res, 401, 'Token tidak valid atau sudah kedaluwarsa.');
    }

    const result = await pool.query(
      `
        SELECT id_pengguna, nama_pengguna, peran, status_aktif
        FROM pengguna
        WHERE id_pengguna = $1
        LIMIT 1
      `,
      [payload.sub]
    );
    const currentUser = result.rows[0];

    if (!currentUser || !currentUser.status_aktif) {
      return buildError(res, 401, 'Akun tidak tersedia atau tidak aktif.');
    }

    req.user = {
      id_pengguna: currentUser.id_pengguna,
      nama_pengguna: currentUser.nama_pengguna,
      peran: currentUser.peran,
    };
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return buildError(res, 401, 'Token tidak valid atau sudah kedaluwarsa.');
    }

    return next(error);
  }
};

const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return buildError(res, 401, 'Autentikasi diperlukan.');
  }

  if (!allowedRoles.includes(req.user.peran)) {
    return buildError(res, 403, 'Akses ditolak untuk peran ini.');
  }

  return next();
};

const requireEmployee = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT k.id_karyawan, k.status_aktif
        FROM karyawan k
        INNER JOIN pengguna p ON p.id_pengguna = k.id_pengguna
        WHERE p.id_pengguna = $1
          AND p.status_aktif = TRUE
          AND p.peran = 'karyawan'
        LIMIT 1
      `,
      [req.user.id_pengguna]
    );
    const employee = result.rows[0];

    if (!employee || !employee.status_aktif) {
      return buildError(res, 403, 'Akun ini tidak memiliki profil karyawan aktif.');
    }

    req.user.id_karyawan = employee.id_karyawan;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  requireAuth,
  requireRole,
  requireEmployee,
};
