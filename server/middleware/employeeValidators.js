const { buildError } = require('../utils/response');

const isValidDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

const isPositiveId = (value) => /^\d+$/.test(String(value)) && BigInt(value) > 0n;

const currentJakartaDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const currentMonthRange = () => {
  const today = currentJakartaDate();
  const [year, month] = today.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    mulai: `${year}-${String(month).padStart(2, '0')}-01`,
    selesai: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
};

const validateDateRange = (req, res, next) => {
  const defaults = currentMonthRange();
  const mulai = req.query.mulai || defaults.mulai;
  const selesai = req.query.selesai || defaults.selesai;

  if (!isValidDate(mulai) || !isValidDate(selesai)) {
    return buildError(res, 400, 'Rentang tanggal harus menggunakan format YYYY-MM-DD yang valid.');
  }

  if (mulai > selesai) {
    return buildError(res, 400, 'Tanggal mulai tidak boleh melewati tanggal selesai.');
  }

  const duration = (Date.parse(`${selesai}T00:00:00Z`) - Date.parse(`${mulai}T00:00:00Z`)) / 86400000;

  if (duration > 92) {
    return buildError(res, 400, 'Rentang tanggal maksimal 93 hari.');
  }

  req.dateRange = { mulai, selesai };
  return next();
};

const validateAttendanceRequest = (req, res, next) => {
  const { id_jadwal, latitude, longitude } = req.body || {};

  if (!isPositiveId(id_jadwal)) {
    return buildError(res, 400, 'ID jadwal wajib diisi dengan nilai positif.');
  }

  if (
    typeof latitude !== 'number'
    || !Number.isFinite(latitude)
    || latitude < -90
    || latitude > 90
    || typeof longitude !== 'number'
    || !Number.isFinite(longitude)
    || longitude < -180
    || longitude > 180
  ) {
    return buildError(res, 400, 'Koordinat lokasi tidak valid.');
  }

  req.validatedAttendance = {
    id_jadwal: String(id_jadwal),
    latitude,
    longitude,
  };
  return next();
};

const validateBranchAttendanceRequest = (req, res, next) => {
  const { id_cabang, latitude, longitude } = req.body || {};

  if (!isPositiveId(id_cabang)) {
    return buildError(res, 400, 'ID cabang wajib diisi dengan nilai positif.');
  }

  if (
    typeof latitude !== 'number'
    || !Number.isFinite(latitude)
    || latitude < -90
    || latitude > 90
    || typeof longitude !== 'number'
    || !Number.isFinite(longitude)
    || longitude < -180
    || longitude > 180
  ) {
    return buildError(res, 400, 'Koordinat lokasi tidak valid.');
  }

  req.validatedBranchAttendance = {
    id_cabang: String(id_cabang),
    latitude,
    longitude,
  };
  return next();
};

const validateAttendanceBranchId = (req, res, next) => {
  if (!isPositiveId(req.params.id)) {
    return buildError(res, 400, 'ID cabang wajib berupa bilangan positif.');
  }

  req.validatedAttendanceBranchId = String(req.params.id);
  return next();
};

const validateLeaveRequest = (req, res, next) => {
  const { tanggal_mulai, tanggal_selesai, jenis_pengajuan, alasan } = req.body || {};

  if (!isValidDate(tanggal_mulai) || !isValidDate(tanggal_selesai)) {
    return buildError(res, 400, 'Tanggal pengajuan harus menggunakan format YYYY-MM-DD yang valid.');
  }

  if (tanggal_selesai < tanggal_mulai) {
    return buildError(res, 400, 'Tanggal selesai tidak boleh sebelum tanggal mulai.');
  }

  if (!['izin', 'sakit'].includes(jenis_pengajuan)) {
    return buildError(res, 400, 'Jenis pengajuan harus berupa izin atau sakit.');
  }

  if (typeof alasan !== 'string' || alasan.trim().length < 5 || alasan.trim().length > 2000) {
    return buildError(res, 400, 'Alasan wajib diisi antara 5 hingga 2000 karakter.');
  }

  req.validatedLeave = {
    tanggal_mulai,
    tanggal_selesai,
    jenis_pengajuan,
    alasan: alasan.trim(),
  };
  return next();
};

const validateScheduleChangeRequest = (req, res, next) => {
  const {
    id_jadwal_asal,
    id_cabang_tujuan,
    tanggal_jadwal_baru,
    id_shift_baru,
    jenis_perubahan,
    alasan,
  } = req.body || {};
  const optionalIds = [id_jadwal_asal, id_cabang_tujuan, id_shift_baru];

  if (!isValidDate(tanggal_jadwal_baru)) {
    return buildError(res, 400, 'Tanggal jadwal baru harus menggunakan format YYYY-MM-DD yang valid.');
  }

  if (!['tukar_shift', 'tukar_libur', 'pindah_cabang', 'ubah_jadwal'].includes(jenis_perubahan)) {
    return buildError(res, 400, 'Jenis perubahan jadwal tidak valid.');
  }

  if (optionalIds.some((id) => id !== undefined && id !== null && id !== '' && !isPositiveId(id))) {
    return buildError(res, 400, 'ID jadwal, cabang, atau shift harus berupa nilai positif.');
  }

  if (typeof alasan !== 'string' || alasan.trim().length < 5 || alasan.trim().length > 2000) {
    return buildError(res, 400, 'Alasan wajib diisi antara 5 hingga 2000 karakter.');
  }

  req.validatedScheduleChange = {
    id_jadwal_asal: id_jadwal_asal ? String(id_jadwal_asal) : null,
    id_cabang_tujuan: id_cabang_tujuan ? String(id_cabang_tujuan) : null,
    tanggal_jadwal_baru,
    id_shift_baru: id_shift_baru ? String(id_shift_baru) : null,
    jenis_perubahan,
    alasan: alasan.trim(),
  };
  return next();
};

module.exports = {
  currentJakartaDate,
  validateDateRange,
  validateAttendanceRequest,
  validateBranchAttendanceRequest,
  validateAttendanceBranchId,
  validateLeaveRequest,
  validateScheduleChangeRequest,
};
