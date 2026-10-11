const { buildSuccess, buildError } = require('../utils/response');
const {
  getMonthlyAttendance,
  buildMonthlyAttendanceWorkbook,
} = require('../services/monthlyReportService');

const getMonthlyReportPreview = async (req, res, next) => {
  try {
    const { rows, total } = await getMonthlyAttendance({
      ...req.validatedMonthlyReport,
      limit: 20,
    });
    return buildSuccess(res, {
      periode: {
        bulan: req.validatedMonthlyReport.bulan,
        tahun: req.validatedMonthlyReport.tahun,
        id_cabang: req.validatedMonthlyReport.id_cabang,
      },
      jumlah: total,
      data: rows,
    }, 200, 'Pratinjau rekap bulanan berhasil diambil.');
  } catch (error) {
    return next(error);
  }
};

const downloadMonthlyReport = async (req, res, next) => {
  try {
    const period = req.validatedMonthlyReport;
    const { rows, total } = await getMonthlyAttendance(period);

    if (total === 0) {
      return buildError(res, 404, 'Tidak ada data absensi untuk periode dan filter yang dipilih.');
    }

    const workbook = await buildMonthlyAttendanceWorkbook(rows, period);
    const month = String(period.bulan).padStart(2, '0');
    const filename = `Rekap_Absensi_${period.tahun}-${month}.xlsx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': workbook.length,
      'X-Content-Type-Options': 'nosniff',
    });
    return res.status(200).send(Buffer.from(workbook));
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMonthlyReportPreview,
  downloadMonthlyReport,
};
