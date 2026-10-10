const { buildSuccess } = require('../utils/response');
const employeeService = require('../services/employeeService');

const getSchedule = async (req, res, next) => {
  try {
    const rows = await employeeService.getSchedule(req.user.id_karyawan, req.dateRange);
    return buildSuccess(res, rows, 200, 'Jadwal kerja berhasil diambil.');
  } catch (error) {
    return next(error);
  }
};

const getActiveShifts = async (req, res, next) => {
  try {
    const rows = await employeeService.getActiveShifts();
    return buildSuccess(res, rows, 200, 'Pilihan shift aktif berhasil diambil.');
  } catch (error) {
    return next(error);
  }
};

const getAttendanceHistory = async (req, res, next) => {
  try {
    const rows = await employeeService.getAttendanceHistory(req.user.id_karyawan, req.dateRange);
    return buildSuccess(res, rows, 200, 'Riwayat absensi berhasil diambil.');
  } catch (error) {
    return next(error);
  }
};

const clockIn = async (req, res, next) => {
  try {
    const attendance = await employeeService.recordAttendance(
      req.user.id_karyawan,
      req.validatedAttendance,
      'masuk'
    );
    return buildSuccess(res, attendance, 201, 'Absensi masuk berhasil dicatat.');
  } catch (error) {
    return next(error);
  }
};

const clockOut = async (req, res, next) => {
  try {
    const attendance = await employeeService.recordAttendance(
      req.user.id_karyawan,
      req.validatedAttendance,
      'pulang'
    );
    return buildSuccess(res, attendance, 200, 'Absensi pulang berhasil dicatat.');
  } catch (error) {
    return next(error);
  }
};

const getLeaveRequests = async (req, res, next) => {
  try {
    const rows = await employeeService.getLeaveRequests(req.user.id_karyawan);
    return buildSuccess(res, rows, 200, 'Pengajuan izin dan sakit berhasil diambil.');
  } catch (error) {
    return next(error);
  }
};

const createLeaveRequest = async (req, res, next) => {
  try {
    const row = await employeeService.createLeaveRequest(req.user.id_karyawan, req.validatedLeave);
    return buildSuccess(res, row, 201, 'Pengajuan tersimpan dengan status menunggu.');
  } catch (error) {
    return next(error);
  }
};

const getScheduleChangeRequests = async (req, res, next) => {
  try {
    const rows = await employeeService.getScheduleChangeRequests(req.user.id_karyawan);
    return buildSuccess(res, rows, 200, 'Pengajuan perubahan jadwal berhasil diambil.');
  } catch (error) {
    return next(error);
  }
};

const createScheduleChangeRequest = async (req, res, next) => {
  try {
    const row = await employeeService.createScheduleChangeRequest(
      req.user.id_karyawan,
      req.validatedScheduleChange
    );
    return buildSuccess(res, row, 201, 'Permohonan perubahan jadwal tersimpan dengan status menunggu.');
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getSchedule,
  getActiveShifts,
  getAttendanceHistory,
  clockIn,
  clockOut,
  getLeaveRequests,
  createLeaveRequest,
  getScheduleChangeRequests,
  createScheduleChangeRequest,
};
