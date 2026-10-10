const { buildError } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500;

  if (process.env.NODE_ENV === 'development') {
    console.error('API_ERROR:', err);
  } else {
    console.error('API_ERROR:', err.message);
  }

  const publicMessage = statusCode >= 500
    ? 'Terjadi kesalahan server. Silakan coba lagi beberapa saat.'
    : err.message || 'Permintaan tidak valid.';

  return buildError(res, statusCode, publicMessage);
};

module.exports = errorHandler;
