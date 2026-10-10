const buildSuccess = (res, data = null, statusCode = 200, message = 'Permintaan berhasil.') => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const buildError = (res, statusCode = 500, message = 'Terjadi kesalahan server.') => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = {
  buildSuccess,
  buildError,
};
