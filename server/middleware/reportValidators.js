const { buildError } = require('../utils/response');

const validateMonthlyReport = (req, res, next) => {
  const { bulan, tahun, id_cabang } = req.query;
  const monthNumber = typeof bulan === 'string' && /^\d{1,2}$/.test(bulan)
    ? Number(bulan)
    : NaN;
  const yearNumber = typeof tahun === 'string' && /^\d{4}$/.test(tahun)
    ? Number(tahun)
    : NaN;

  if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return buildError(res, 400, 'Bulan harus berupa angka antara 1 dan 12.');
  }

  if (!Number.isInteger(yearNumber) || yearNumber < 1 || yearNumber > 9999) {
    return buildError(res, 400, 'Tahun harus menggunakan format empat digit yang valid.');
  }

  let branchId = null;
  if (id_cabang !== undefined && id_cabang !== '') {
    if (
      typeof id_cabang !== 'string'
      || !/^[1-9]\d{0,18}$/.test(id_cabang)
      || BigInt(id_cabang) > 9223372036854775807n
    ) {
      return buildError(res, 400, 'Filter cabang harus berupa ID positif yang valid.');
    }
    branchId = id_cabang;
  }

  req.validatedMonthlyReport = {
    bulan: monthNumber,
    tahun: yearNumber,
    id_cabang: branchId,
  };
  return next();
};

module.exports = {
  validateMonthlyReport,
};
