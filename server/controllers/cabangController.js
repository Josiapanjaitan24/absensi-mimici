const pool = require('../config/db');
const { buildSuccess, buildError } = require('../utils/response');

const getCabang = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT
          id_cabang,
          nama_cabang,
          slug,
          latitude,
          longitude,
          radius_meter,
          status_aktif
        FROM cabang
        WHERE status_aktif = TRUE
        ORDER BY id_cabang ASC
      `
    );

    return buildSuccess(res, result.rows, 200, 'Data cabang berhasil diambil.');
  } catch (error) {
    return next(error);
  }
};

const getHealth = (req, res) => {
  return buildSuccess(res, {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'Absensi Mimici API',
  }, 200, 'Server dalam kondisi sehat.');
};

module.exports = {
  getCabang,
  getHealth,
};
