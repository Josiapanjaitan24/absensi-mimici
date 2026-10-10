const { buildError } = require('../utils/response');

const validateLoginRequest = (req, res, next) => {
  const { nama_pengguna, kata_sandi } = req.body || {};

  if (typeof nama_pengguna !== 'string' || nama_pengguna.trim().length < 3) {
    return buildError(res, 400, 'Nama pengguna wajib diisi minimal 3 karakter.');
  }

  if (typeof kata_sandi !== 'string' || kata_sandi.length < 6) {
    return buildError(res, 400, 'Kata sandi wajib diisi minimal 6 karakter.');
  }

  req.body = {
    nama_pengguna: nama_pengguna.trim(),
    kata_sandi,
  };

  return next();
};

module.exports = {
  validateLoginRequest,
};
